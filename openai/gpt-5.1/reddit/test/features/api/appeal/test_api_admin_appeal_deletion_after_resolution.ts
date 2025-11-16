import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Validate that an adminUser can delete an existing appeal record created by a
 * memberUser, while all related moderation data (moderation case, moderation
 * action, account restriction) remains conceptually intact.
 *
 * Business flow implemented:
 *
 * 1. Admin registers (join) and becomes authenticated via JWT.
 * 2. Admin creates a moderation case that will own subsequent moderation actions.
 * 3. Admin optionally creates an account restriction episode to be linked to the
 *    moderation action.
 * 4. Admin creates a moderation action header referencing the moderation case and
 *    restriction.
 * 5. Member registers (join) and becomes authenticated; this member represents the
 *    appellant.
 * 6. Member creates an appeal referencing the moderation action.
 * 7. Admin logs in again to restore admin auth context.
 * 8. Admin deletes the appeal via DELETE
 *    /communityPlatform/adminUser/appeals/{appealId}.
 *
 * Due to the absence of GET endpoints for appeals and other entities, we
 * validate this scenario by:
 *
 * - Asserting types on every creation response with typia.assert().
 * - Verifying key relationship wiring using TestValidator.equals().
 * - Ensuring the DELETE call completes without throwing an error.
 */
export async function test_api_admin_appeal_deletion_after_resolution(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + authenticated context)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1n#" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;

  // 2. Admin creates a moderation case
  const moderationCaseBody = {
    case_key: "CASE-" + RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminId,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  TestValidator.equals(
    "moderation case creator must match joined admin",
    moderationCase.creator_admin.id,
    adminId,
  );

  // 3. Admin creates an account restriction episode (optional but used for linking)
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

  const accountRestrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: now.toISOString(),
    ends_at: later.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const accountRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: accountRestrictionBody,
      },
    );
  typia.assert(accountRestriction);

  // 4. Admin creates a moderation action header linked to the case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: accountRestriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // Relationship invariants via summary associations when present
  if (moderationAction.moderation_case !== undefined) {
    TestValidator.equals(
      "moderation action summary moderation_case id matches created case id",
      moderationAction.moderation_case.id,
      moderationCase.id,
    );
  }

  if (
    moderationAction.account_restriction !== undefined &&
    moderationAction.account_restriction !== null
  ) {
    TestValidator.equals(
      "moderation action summary account_restriction id matches created restriction id",
      moderationAction.account_restriction.id,
      accountRestriction.id,
    );
  }

  // 5. Member joins (this switches Authorization header context to memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Memb3r#" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 6. Member creates an appeal referencing the moderation action
  const appealBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealBody,
      },
    );
  typia.assert(appeal);

  // Validate appeal wiring
  TestValidator.equals(
    "appeal moderation_action id must match created moderation action id",
    appeal.moderation_action.id,
    moderationAction.id,
  );

  TestValidator.equals(
    "appeal appellant_member_user id must match joined member user id",
    appeal.appellant_member_user.id,
    memberId,
  );

  // 7. Switch back to admin context using admin login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminReAuth: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuth);

  TestValidator.equals(
    "re-authenticated admin id should match originally joined admin id",
    adminReAuth.id,
    adminId,
  );

  // 8. Admin deletes the appeal
  await api.functional.communityPlatform.adminUser.appeals.erase(connection, {
    appealId: appeal.id,
  });

  // Since DELETE returns void and we have no GET to verify not-found,
  // we only assert that reaching this point means the deletion call did not throw.
  TestValidator.predicate(
    "admin appeal deletion call completed without throwing",
    true,
  );
}
