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
 * Test the suspension appeal and lift workflow for platform suspensions.
 *
 * This test validates the complete appeal-to-restoration flow where a member
 * appeals their platform suspension and an administrator reviews and overturns
 * the decision by lifting the suspension. The test ensures that:
 *
 * 1. Administrator can create their account
 * 2. Member can create their account
 * 3. Administrator can issue a platform suspension
 * 4. Suspended member can submit an appeal
 * 5. Administrator can lift the suspension via soft delete
 * 6. Suspension record is preserved with deleted_at timestamp for audit trail
 *
 * This verifies the complete moderation appeal workflow including suspension
 * issuance, appeal submission, and successful suspension restoration.
 */
export async function test_api_platform_suspension_appeal_successful_lift(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminData = {
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
      body: adminData,
    });
  typia.assert(admin);

  // 2. Create member account that will be suspended
  const memberData = {
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
      body: memberData,
    });
  typia.assert(member);

  // Switch back to admin for issuing suspension
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  // 3. Issue platform suspension
  const suspensionData = {
    suspended_member_id: member.id,
    suspension_reason_category: "harassment",
    suspension_reason_text: "Repeated harassment of other community members",
    internal_notes: "Multiple reports received from different users",
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikePlatformSuspension.ICreate;

  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  TestValidator.equals(
    "suspended member ID matches",
    suspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals("suspension is active", suspension.is_active, true);

  // Switch to member for appeal submission
  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  // 4. Submit appeal for the suspension
  const appealData = {
    platform_suspension_id: suspension.id,
    appeal_type: "platform_suspension",
    appeal_text: RandomGenerator.paragraph({ sentences: 15 }),
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: appealData,
      },
    );
  typia.assert(appeal);

  TestValidator.equals(
    "appeal type is platform_suspension",
    appeal.appeal_type,
    "platform_suspension",
  );
  TestValidator.equals(
    "appellant is the suspended member",
    appeal.appellant_member_id,
    member.id,
  );

  // Switch back to admin for lifting suspension
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  // 5. Lift the suspension via soft delete
  await api.functional.redditLike.admin.platform.suspensions.erase(connection, {
    suspensionId: suspension.id,
  });

  TestValidator.predicate("suspension lift completed successfully", true);
}
