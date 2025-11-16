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
 * Validate that adminUser cannot perform invalid status transitions on appeals.
 *
 * Business context:
 *
 * - Member users can appeal moderation actions.
 * - Admin users review those appeals and resolve them into terminal states such
 *   as "approved" or "rejected".
 * - Once an appeal is in a terminal state, business rules prohibit moving it back
 *   to a non-terminal state like "pending" or "under_review".
 *
 * This test simulates the full flow:
 *
 * 1. Create a memberUser (appellant) account via memberUser join.
 * 2. Create an adminUser account via adminUser join, and rely on automatic login.
 * 3. As adminUser, create a moderation case.
 * 4. As adminUser, create a moderation action belonging to that case.
 * 5. Switch to memberUser and create an appeal for the moderation action.
 * 6. Switch back to adminUser and resolve the appeal into a terminal status (e.g.,
 *    "approved") with a decision_reason and resolved_at.
 * 7. Attempt an invalid transition by trying to set status back to a non-terminal
 *    state such as "pending" using the same update endpoint.
 *
 * Validations:
 *
 * - The successful terminal-state update returns an appeal with the expected
 *   status and populated resolved_at.
 * - The invalid transition call must fail (throw), so the test wraps it in
 *   TestValidator.error.
 * - Because the SDK does not provide an explicit GET endpoint for appeals, we
 *   treat the thrown error as evidence that the invalid transition was rejected
 *   and therefore did not mutate the appeal.
 */
export async function test_api_admin_appeal_update_invalid_status_transition(
  connection: api.IConnection,
) {
  // 1. Create memberUser (appellant)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join/member",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create adminUser and rely on automatic login
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As adminUser, create a moderation case
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 4. As adminUser, optionally create an account restriction (to make
  //    the moderation action more realistic)
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  // 5. As adminUser, create a moderation action that belongs to the case and
  //    (optionally) references the restriction.
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert(moderationAction);

  // 6. Switch to memberUser and create an appeal for the moderation action
  //    by logging in as the member (ensures connection has memberUser token).
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login/member",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const appealCreateBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: appealCreateBody },
    );
  typia.assert(createdAppeal);

  // 7. Switch back to adminUser to review and resolve the appeal
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/login/admin",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. Legitimately resolve the appeal into a terminal state (e.g. "approved")
  const resolutionTimestamp = new Date().toISOString();
  const resolutionBody = {
    status: "approved",
    decision_reason: RandomGenerator.paragraph({ sentences: 4 }),
    resolved_at: resolutionTimestamp,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const resolvedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: createdAppeal.id,
        body: resolutionBody,
      },
    );
  typia.assert(resolvedAppeal);

  // Validate that the appeal is now in a terminal state with resolved_at
  TestValidator.equals(
    "appeal status should be terminal 'approved' after legitimate resolution",
    resolvedAppeal.status,
    resolutionBody.status,
  );
  TestValidator.equals(
    "appeal resolved_at should match provided resolution timestamp",
    resolvedAppeal.resolved_at,
    resolutionBody.resolved_at,
  );
  TestValidator.equals(
    "appeal decision_reason should match admin decision",
    resolvedAppeal.decision_reason,
    resolutionBody.decision_reason,
  );

  // 9. Attempt invalid transition: from terminal "approved" back to
  //    non-terminal "pending". This should fail per business rules.
  const invalidUpdateBody = {
    status: "pending",
    decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
    resolved_at: resolvedAppeal.resolved_at,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  await TestValidator.error(
    "invalid status transition from terminal 'approved' back to 'pending' must be rejected",
    async () => {
      await api.functional.communityPlatform.adminUser.appeals.update(
        connection,
        {
          appealId: createdAppeal.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
