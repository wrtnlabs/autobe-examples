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
 * Verify that only the rightful member user can appeal a moderation action.
 *
 * Business goal: Ensure that the memberUser-facing appeal API enforces
 * ownership constraints so that a member cannot file an appeal against
 * moderation actions that target other accounts or foreign content/communities.
 * Only the affected member (or their content/community owner) should be allowed
 * to appeal.
 *
 * Scenario:
 *
 * 1. Create an administrative actor (adminUser) who can open moderation cases and
 *    issue moderation actions.
 * 2. Create two distinct member users: memberA (the subject of moderation) and
 *    memberB (an unrelated member).
 * 3. As adminUser, open a moderation case.
 * 4. As adminUser, create an account restriction episode (generic restriction
 *    targeting a `memberUser` account_type) that will conceptually apply to
 *    memberA.
 * 5. As adminUser, create a moderation action tied to the moderation case and
 *    optionally associated with the restriction, representing enforcement
 *    against memberA or their content.
 * 6. Authenticate as memberB and attempt to create an appeal for that moderation
 *    action; this should fail due to ownership/authorization rules.
 * 7. Authenticate as memberA and create an appeal for the same moderation action;
 *    this should succeed.
 * 8. Validate that the successful appeal is structurally correct and linked to the
 *    correct moderation action and appellant.
 */
export async function test_api_member_appeal_creation_for_foreign_action_forbidden(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (implicitly authenticates as adminUser)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies Format<"password"> contract
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Persist admin login identifier for future logins
  const adminIdentifier: string = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Register memberA
  const memberABody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberAPass1!", // >= 8 chars
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberABody,
    });
  typia.assert(memberAAuth);

  const memberAIdentifier: string = memberAAuth.email;
  const memberAPassword: string = memberABody.password;

  // 2b. Register memberB
  const memberBBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberBPass1!", // >= 8 chars
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberBAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBBody,
    });
  typia.assert(memberBAuth);

  const memberBIdentifier: string = memberBAuth.email;
  const memberBPassword: string = memberBBody.password;

  // 3. Ensure we are authenticated as adminUser again (explicit login helps
  //    keep the test robust even if join had set the token earlier).
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Create a moderation case for memberA context
  const moderationCaseBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: "Abusive behavior investigation",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert(moderationCase);

  // 5. Create an account restriction episode for a memberUser account
  const now: Date = new Date();
  const startsAt: string = now.toISOString();
  const endsAt: string = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: "Temporary posting suspension due to abusive behavior.",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  // 6. Create a moderation action associated with the case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: "Restrict memberA for abusive comments in community.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert(moderationAction);

  // 7. Authenticate as memberB and attempt a forbidden appeal
  const memberBLoginBody = {
    identifier: memberBIdentifier,
    password: memberBPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  const foreignAppealBody = {
    moderation_action_id: moderationAction.id,
    justification:
      "I am another user trying to appeal someone else's restriction.",
  } satisfies ICommunityPlatformAppeal.ICreate;

  await TestValidator.error(
    "memberB cannot create appeal for foreign moderation action",
    async () => {
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        { body: foreignAppealBody },
      );
    },
  );

  // 8. Authenticate as memberA and create a valid appeal
  const memberALoginBody = {
    identifier: memberAIdentifier,
    password: memberAPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const ownAppealBody = {
    moderation_action_id: moderationAction.id,
    justification: "I believe this restriction was a misunderstanding.",
  } satisfies ICommunityPlatformAppeal.ICreate;

  const ownAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: ownAppealBody },
    );
  typia.assert(ownAppeal);

  // 9. Business-level validations on the successful appeal
  TestValidator.equals(
    "appeal is linked to the correct moderation action",
    ownAppeal.moderation_action.id,
    moderationAction.id,
  );

  TestValidator.equals(
    "appeal appellant matches memberA",
    ownAppeal.appellant_member_user.id,
    memberALogin.id,
  );
}
