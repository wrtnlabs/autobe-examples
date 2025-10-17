import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test administrator retrieval of platform suspension details by ID.
 *
 * This test validates the complete workflow for administrators to retrieve
 * detailed platform-wide suspension information. The test follows these steps:
 *
 * 1. Register and authenticate as an administrator
 * 2. Create a member account that will be suspended
 * 3. Issue a platform suspension against the member (as admin)
 * 4. Retrieve the suspension details using its unique identifier
 * 5. Validate that all suspension metadata is correctly returned
 *
 * The test verifies that the retrieved suspension contains complete audit
 * information including suspended member identity, reason category, detailed
 * explanation, permanence status, expiration date, and active status.
 */
export async function test_api_platform_suspension_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminRegistration = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRegistration,
    });
  typia.assert(admin);

  // Save admin authorization token
  const adminToken = admin.token.access;

  // Step 2: Create a member account to be suspended
  const memberRegistration = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(member);

  // Step 3: Restore admin authentication for suspension operations
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminToken;

  const suspensionReasonCategories = [
    "repeated_violations",
    "harassment",
    "spam",
    "hate_speech",
    "illegal_content",
    "ban_evasion",
    "other",
  ] as const;
  const randomCategory = RandomGenerator.pick(suspensionReasonCategories);

  const suspensionData = {
    suspended_member_id: member.id,
    suspension_reason_category: randomCategory,
    suspension_reason_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    internal_notes: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikePlatformSuspension.ICreate;

  const createdSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(createdSuspension);

  // Step 4: Retrieve the suspension by its ID
  const retrievedSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.at(connection, {
      suspensionId: createdSuspension.id,
    });
  typia.assert(retrievedSuspension);

  // Step 5: Validate suspension details match
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    createdSuspension.id,
  );

  TestValidator.equals(
    "suspended member ID matches",
    retrievedSuspension.suspended_member_id,
    member.id,
  );

  TestValidator.equals(
    "suspension reason category matches",
    retrievedSuspension.suspension_reason_category,
    suspensionData.suspension_reason_category,
  );

  TestValidator.equals(
    "suspension reason text matches",
    retrievedSuspension.suspension_reason_text,
    suspensionData.suspension_reason_text,
  );

  TestValidator.equals(
    "is_permanent flag matches",
    retrievedSuspension.is_permanent,
    suspensionData.is_permanent,
  );

  TestValidator.equals(
    "expiration_date matches",
    retrievedSuspension.expiration_date,
    suspensionData.expiration_date,
  );

  TestValidator.equals(
    "suspension is active",
    retrievedSuspension.is_active,
    true,
  );

  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedSuspension.created_at !== undefined &&
      retrievedSuspension.created_at !== null,
  );
}
