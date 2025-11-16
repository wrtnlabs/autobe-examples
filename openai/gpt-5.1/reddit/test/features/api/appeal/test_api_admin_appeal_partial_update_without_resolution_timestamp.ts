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

export async function test_api_admin_appeal_partial_update_without_resolution_timestamp(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates adminUser account)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Member joins (creates memberUser account)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://client.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. Ensure we are authenticated as adminUser for admin-only endpoints
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 4. Create moderation case as admin
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 5. Optionally create account restriction episode as admin
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

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
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 6. Create moderation action associated with the moderation case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 7. Switch to memberUser and create an appeal against that moderation action
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://client.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  const createAppealBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: createAppealBody },
    );
  typia.assert<ICommunityPlatformAppeal>(createdAppeal);

  // Capture original state
  const originalAppealId = createdAppeal.id;
  const originalCreatedAt = createdAppeal.created_at;
  const originalUpdatedAt = createdAppeal.updated_at;
  const originalStatus = createdAppeal.status;
  const originalResolvedAt = createdAppeal.resolved_at ?? null;

  // 8. Switch back to adminUser to perform partial update
  const adminLoginAgain: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginAgain);

  const partialDecisionReason = RandomGenerator.paragraph({ sentences: 4 });
  const nonTerminalStatus = "under_review";

  const partialUpdateBody = {
    status: nonTerminalStatus,
    decision_reason: partialDecisionReason,
    // resolved_at intentionally omitted for partial update
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const partiallyUpdated: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: originalAppealId,
        body: partialUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(partiallyUpdated);

  // Validate partial update invariants
  TestValidator.equals(
    "appeal id stable across partial update",
    partiallyUpdated.id,
    originalAppealId,
  );

  TestValidator.predicate(
    "partial update should change updated_at",
    partiallyUpdated.updated_at !== originalUpdatedAt,
  );

  TestValidator.equals(
    "partial update should not change created_at",
    partiallyUpdated.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "partial update sets non-terminal status",
    partiallyUpdated.status,
    nonTerminalStatus,
  );

  TestValidator.equals(
    "partial update sets decision_reason to partial note",
    partiallyUpdated.decision_reason ?? null,
    partialDecisionReason,
  );

  TestValidator.predicate(
    "resolved_at remains null or undefined after partial update",
    partiallyUpdated.resolved_at === null ||
      partiallyUpdated.resolved_at === undefined,
  );

  // 9. Final resolution update by admin: mark appeal resolved
  const finalStatus = "approved";
  const finalDecisionReason = RandomGenerator.paragraph({ sentences: 5 });
  const finalResolvedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const finalUpdateBody = {
    status: finalStatus,
    decision_reason: finalDecisionReason,
    resolved_at: finalResolvedAt,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const resolvedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: originalAppealId,
        body: finalUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(resolvedAppeal);

  // Validate final resolution invariants
  TestValidator.equals(
    "appeal id stable across final update",
    resolvedAppeal.id,
    originalAppealId,
  );

  TestValidator.predicate(
    "final update should bump updated_at again",
    resolvedAppeal.updated_at !== partiallyUpdated.updated_at,
  );

  TestValidator.equals(
    "final status should be terminal (approved)",
    resolvedAppeal.status,
    finalStatus,
  );

  TestValidator.equals(
    "final decision_reason should overwrite partial reason",
    resolvedAppeal.decision_reason ?? null,
    finalDecisionReason,
  );

  TestValidator.predicate(
    "resolved_at should be non-null after final resolution",
    resolvedAppeal.resolved_at !== null &&
      resolvedAppeal.resolved_at !== undefined,
  );
}
