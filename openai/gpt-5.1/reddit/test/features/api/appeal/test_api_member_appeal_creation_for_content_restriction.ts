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
 * Validate memberUser appeal creation for a content/account restriction.
 *
 * Business flow:
 *
 * 1. Create an adminUser via /auth/adminUser/join (implicitly authenticated).
 * 2. Create a memberUser via /auth/memberUser/join (implicitly authenticated as
 *    member).
 * 3. Switch to adminUser via /auth/adminUser/login to ensure admin context.
 * 4. Admin creates an account restriction episode that targets memberUser
 *    accounts.
 * 5. Admin opens a moderation case to group the enforcement activity.
 * 6. Admin records a moderation action linked to the moderation case and the
 *    restriction.
 * 7. Switch to memberUser via /auth/memberUser/login.
 * 8. Member creates an appeal against the moderation action.
 * 9. Validate that the appeal links to the correct moderation action and appellant
 *    member summary and has status and timestamps populated.
 * 10. Additionally, verify that an unauthenticated connection cannot create an
 *     appeal.
 */
export async function test_api_member_appeal_creation_for_content_restriction(
  connection: api.IConnection,
) {
  // 1. AdminUser join (creates and authenticates admin context)
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. MemberUser join (creates and authenticates member context)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch to admin context explicitly via login
  const adminLoginBody = {
    identifier: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. Admin creates an account restriction episode targeting memberUser accounts
  const now: Date = new Date();
  const startsAt: string = now.toISOString();
  const endsAt: string = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const restrictionCreateBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionCreateBody,
      },
    );
  typia.assert(restriction);

  // 5. Admin opens a moderation case
  const caseKey: string = `CASE-${RandomGenerator.alphaNumeric(8)}`;
  const moderationCaseCreateBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseCreateBody,
      },
    );
  typia.assert(moderationCase);

  // 6. Admin records a moderation action linked to the case and account restriction
  const moderationActionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 7. Switch back to memberUser via login to ensure member context
  const memberLoginBody = {
    identifier: memberEmail,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/post/123",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 8. Member creates an appeal against the moderation action
  const justification: string = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 10,
  });

  const appealCreateBody = {
    moderation_action_id: moderationAction.id,
    justification,
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 9. Validate appeal structure and linkage
  TestValidator.equals(
    "appeal moderation_action.id matches created moderationAction.id",
    appeal.moderation_action.id,
    moderationAction.id,
  );

  TestValidator.equals(
    "appeal moderation_action.moderation_case.id matches created moderationCase.id",
    appeal.moderation_action.moderation_case.id,
    moderationCase.id,
  );

  TestValidator.equals(
    "appeal appellant member id matches logged-in member user id",
    appeal.appellant_member_user.id,
    memberLoginAuthorized.id,
  );

  TestValidator.predicate(
    "appeal status should be non-empty string",
    appeal.status.length > 0,
  );

  TestValidator.equals(
    "appeal justification should equal submitted justification",
    appeal.justification,
    justification,
  );

  TestValidator.predicate(
    "appeal created_at should be a plausible ISO timestamp",
    () => {
      const created = new Date(appeal.created_at);
      return !Number.isNaN(created.getTime());
    },
  );

  TestValidator.predicate(
    "appeal updated_at should be a plausible ISO timestamp",
    () => {
      const updated = new Date(appeal.updated_at);
      return !Number.isNaN(updated.getTime());
    },
  );

  // 10. Failure scenario: unauthenticated connection cannot create an appeal
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection should not be able to create an appeal",
    async () => {
      await api.functional.communityPlatform.memberUser.appeals.create(
        unauthConnection,
        {
          body: appealCreateBody,
        },
      );
    },
  );
}
