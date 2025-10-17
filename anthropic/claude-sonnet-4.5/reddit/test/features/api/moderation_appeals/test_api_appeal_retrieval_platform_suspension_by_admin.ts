import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test administrator retrieval of platform suspension appeal details.
 *
 * This test validates the complete workflow of platform suspension appeals from
 * creation to administrator review. The test ensures that administrators can
 * retrieve comprehensive appeal information including suspension context,
 * member appeal reasoning, and all metadata necessary for making informed
 * decisions.
 *
 * Workflow:
 *
 * 1. Create a member account that will be suspended
 * 2. Create an administrator account for suspension management and appeal review
 * 3. Administrator issues a platform-wide suspension to the member
 * 4. Suspended member submits an appeal against the platform suspension
 * 5. Administrator retrieves the complete appeal details
 * 6. Validate that appeal contains all necessary information for review
 */
export async function test_api_appeal_retrieval_platform_suspension_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account with fresh connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(unauthConnection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Administrator issues platform-wide suspension (admin is already authenticated)
  const suspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      unauthConnection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: "policy_violation",
          suspension_reason_text:
            "Repeated violations of community guidelines and platform policies including harassment and spam",
          internal_notes:
            "User has multiple reports across different communities",
          is_permanent: false,
          expiration_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 4: Suspended member submits appeal (switch back to member authentication)
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          platform_suspension_id: suspension.id,
          appeal_type: "platform_suspension",
          appeal_text: RandomGenerator.paragraph({
            sentences: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 5: Administrator retrieves appeal details (use admin connection)
  const retrievedAppeal =
    await api.functional.redditLike.admin.moderation.appeals.at(
      unauthConnection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 6: Validate appeal contains comprehensive information
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appellant member ID matches",
    retrievedAppeal.appellant_member_id,
    member.id,
  );
  TestValidator.equals(
    "appeal type is platform_suspension",
    retrievedAppeal.appeal_type,
    "platform_suspension",
  );
  TestValidator.equals(
    "appeal text matches",
    retrievedAppeal.appeal_text,
    appeal.appeal_text,
  );
  TestValidator.equals(
    "appeal status is pending",
    retrievedAppeal.status,
    "pending",
  );
  TestValidator.predicate(
    "appeal is not escalated initially",
    retrievedAppeal.is_escalated === false,
  );
  TestValidator.predicate(
    "expected resolution date exists",
    retrievedAppeal.expected_resolution_at !== null &&
      retrievedAppeal.expected_resolution_at !== undefined,
  );
  TestValidator.predicate(
    "appeal creation timestamp exists",
    retrievedAppeal.created_at !== null &&
      retrievedAppeal.created_at !== undefined,
  );
}
