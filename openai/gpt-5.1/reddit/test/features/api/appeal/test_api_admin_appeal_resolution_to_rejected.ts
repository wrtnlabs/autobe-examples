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

export async function test_api_admin_appeal_resolution_to_rejected(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) to obtain initial admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    // Let `satisfies` enforce the password format instead of explicit assertion
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Register a memberUser (join) to act as the appellant
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. Ensure we are authenticated as adminUser before invoking admin-only APIs
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const _adminLoginForCase: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(_adminLoginForCase);

  // 4. As adminUser, create a moderation case that will own the moderation action
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 5. Optionally create an account restriction episode for the member user
  const now = new Date();
  const restrictionStartsAt = now.toISOString();
  const restrictionEndsAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: restrictionStartsAt,
    ends_at: restrictionEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 6. Create a moderation action associated with the moderation case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 7. Authenticate as memberUser and create an appeal against the moderation action
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const _memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(_memberLogin);

  const appealCreateBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(createdAppeal);

  // 8. Switch back to adminUser before resolving the appeal
  const _adminLoginForAppeal: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(_adminLoginForAppeal);

  // 9. As adminUser, reject the appeal with decision metadata
  const resolutionTimestamp = new Date().toISOString();
  const decisionReason =
    "Appeal rejected after review: original moderation action is consistent with community guidelines.";

  const appealUpdateBody = {
    status: "rejected",
    decision_reason: decisionReason,
    resolved_at: resolutionTimestamp,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const rejectedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: createdAppeal.id,
        body: appealUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(rejectedAppeal);

  // 10. Validate that the appeal is rejected and the decision metadata is persisted
  TestValidator.equals(
    "appeal id remains consistent after rejection",
    rejectedAppeal.id,
    createdAppeal.id,
  );

  TestValidator.equals(
    "appeal status updated to rejected",
    rejectedAppeal.status,
    "rejected",
  );

  TestValidator.equals(
    "decision_reason persisted as provided",
    rejectedAppeal.decision_reason ?? null,
    decisionReason,
  );

  TestValidator.predicate(
    "resolved_at is set on rejected appeal",
    rejectedAppeal.resolved_at !== null &&
      rejectedAppeal.resolved_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(rejectedAppeal.updated_at).getTime() >=
      new Date(rejectedAppeal.created_at).getTime(),
  );

  // 11. Attempt a second update to observe behavior of re-resolving the same appeal
  const secondResolutionTimestamp = new Date(
    Date.now() + 60 * 1000,
  ).toISOString();
  const secondDecisionReason =
    "Second decision note to observe multiple resolution behavior.";

  const secondUpdateBody = {
    status: "approved",
    decision_reason: secondDecisionReason,
    resolved_at: secondResolutionTimestamp,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const secondUpdateAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: createdAppeal.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(secondUpdateAppeal);

  // Document the behavior: status and decision_reason should reflect the second update
  TestValidator.equals(
    "appeal status reflects second update",
    secondUpdateAppeal.status,
    secondUpdateBody.status,
  );

  TestValidator.equals(
    "appeal decision_reason reflects second update",
    secondUpdateAppeal.decision_reason ?? null,
    secondDecisionReason,
  );
}
