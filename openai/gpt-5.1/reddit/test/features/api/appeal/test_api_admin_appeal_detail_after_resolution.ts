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

export async function test_api_admin_appeal_detail_after_resolution(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) to obtain an admin context
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Explicitly login as the same adminUser (ensures token refresh and matches dependency list)
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create a moderation case as adminUser
  const caseKey: string = `case-${RandomGenerator.alphaNumeric(12)}`;
  const moderationCaseBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // 4. Create an account restriction episode (memberUser scope, short window)
  const now = new Date();
  const startsAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert(restriction);

  // 5. Create a moderation action linked to the moderation case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 6. Register a memberUser via join (switches Authorization to memberUser)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPassw0rd!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 7. Optionally login as memberUser explicitly (ensures session behavior and matches dependency list)
  const memberLoginBody = {
    identifier: memberUsername,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 8. As memberUser, create a pending appeal against the moderation action
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
  typia.assert(createdAppeal);

  const originalAppealId = createdAppeal.id; // preserve uuid tag
  const originalStatus: string = createdAppeal.status;
  const originalCreatedAt: string = createdAppeal.created_at;
  const originalUpdatedAt: string = createdAppeal.updated_at;
  const originalResolvedAt: string | null | undefined =
    createdAppeal.resolved_at;

  // Sanity checks on initial appeal
  TestValidator.predicate(
    "initial appeal id should be stable",
    createdAppeal.id === originalAppealId,
  );
  TestValidator.predicate(
    "initial appeal created_at should be <= updated_at",
    originalCreatedAt <= originalUpdatedAt,
  );

  // 9. Switch back to adminUser via login (Authorization becomes admin again)
  const adminReLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLogin);

  // 10. As adminUser, resolve the appeal via update (PUT)
  const decisionReason = RandomGenerator.paragraph({ sentences: 2 });
  const resolvedStatus = "approved";

  const appealUpdateBody = {
    status: resolvedStatus,
    decision_reason: decisionReason,
    // resolved_at intentionally omitted so backend sets it
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: originalAppealId,
        body: appealUpdateBody,
      },
    );
  typia.assert(updatedAppeal);

  const updatedCreatedAt: string = updatedAppeal.created_at;
  const updatedUpdatedAt: string = updatedAppeal.updated_at;
  const updatedResolvedAt: string | null | undefined =
    updatedAppeal.resolved_at;

  // Basic invariants around update response
  TestValidator.equals(
    "updated appeal should keep same id as original",
    updatedAppeal.id,
    originalAppealId,
  );
  TestValidator.equals(
    "updated appeal created_at should remain unchanged",
    updatedCreatedAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated appeal updated_at should be >= original updated_at",
    updatedUpdatedAt >= originalUpdatedAt,
  );
  TestValidator.equals(
    "updated appeal status should match resolvedStatus",
    updatedAppeal.status,
    resolvedStatus,
  );
  TestValidator.equals(
    "updated appeal decision_reason should match provided one",
    updatedAppeal.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "updated appeal resolved_at should be non-null after resolution",
    updatedResolvedAt !== null && updatedResolvedAt !== undefined,
  );
  if (updatedResolvedAt !== null && updatedResolvedAt !== undefined) {
    TestValidator.predicate(
      "updated appeal resolved_at should be >= created_at",
      updatedResolvedAt >= originalCreatedAt,
    );
  }

  // 11. Fetch appeal detail via admin GET endpoint
  const detailAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.at(connection, {
      appealId: originalAppealId,
    });
  typia.assert(detailAppeal);

  const detailCreatedAt: string = detailAppeal.created_at;
  const detailUpdatedAt: string = detailAppeal.updated_at;
  const detailResolvedAt: string | null | undefined = detailAppeal.resolved_at;

  // 12. Cross-validate detail with updated appeal
  TestValidator.equals(
    "detail appeal id should equal original id",
    detailAppeal.id,
    originalAppealId,
  );
  TestValidator.equals(
    "detail appeal created_at should equal original created_at",
    detailCreatedAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "detail updated_at should be >= original updated_at",
    detailUpdatedAt >= originalUpdatedAt,
  );
  TestValidator.predicate(
    "detail updated_at should be >= updated updated_at",
    detailUpdatedAt >= updatedUpdatedAt,
  );
  TestValidator.equals(
    "detail status should reflect resolvedStatus",
    detailAppeal.status,
    resolvedStatus,
  );
  TestValidator.equals(
    "detail decision_reason should match the admin decision",
    detailAppeal.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "detail resolved_at should be non-null",
    detailResolvedAt !== null && detailResolvedAt !== undefined,
  );
  if (detailResolvedAt !== null && detailResolvedAt !== undefined) {
    TestValidator.predicate(
      "detail resolved_at should be >= created_at",
      detailResolvedAt >= originalCreatedAt,
    );
  }

  // 13. Ensure initial vs final status/resolution variance
  TestValidator.predicate(
    "initial status should differ from resolved status",
    originalStatus !== resolvedStatus,
  );
  TestValidator.predicate(
    "initial resolved_at should be null or undefined before resolution",
    originalResolvedAt === null || originalResolvedAt === undefined,
  );
}
