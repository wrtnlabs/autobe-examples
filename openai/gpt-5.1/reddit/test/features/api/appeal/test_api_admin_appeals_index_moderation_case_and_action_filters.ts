import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";

/**
 * Validate that adminUser appeals index supports filtering by moderation action
 * and case.
 *
 * Business workflow:
 *
 * 1. Register an adminUser and rely on the issued token for admin operations.
 * 2. Create two moderation cases (case A and case B).
 * 3. Create moderation actions A1 (on case A) and B1 (on case B).
 * 4. Register two member users and have them submit appeals against A1 and B1.
 * 5. As adminUser, use PATCH /communityPlatform/adminUser/appeals to filter by
 *    moderationActionId and moderationCaseId.
 * 6. Cross-check case-based appeals index (PATCH
 *    /communityPlatform/adminUser/moderationCases/{caseKey}/appeals) against
 *    the global appeals index filtered by moderationCaseId.
 * 7. Exercise combined filters (action + status + date range) and ensure all
 *    constraints are applied simultaneously.
 */
export async function test_api_admin_appeals_index_moderation_case_and_action_filters(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated adminUser context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd!";

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create two moderation cases (case A and case B)
  const caseABody = {
    case_key: `CASE-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const caseA =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: caseABody },
    );
  typia.assert<ICommunityPlatformModerationCase>(caseA);

  const caseBBody = {
    case_key: `CASE-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const caseB =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: caseBBody },
    );
  typia.assert<ICommunityPlatformModerationCase>(caseB);

  // 3. Create moderation actions A1 (on case A) and B1 (on case B)
  const actionABody = {
    moderation_case_id: caseA.id,
    account_restriction_id: null,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const actionA =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: actionABody },
    );
  typia.assert<ICommunityPlatformModerationAction>(actionA);

  const actionBBody = {
    moderation_case_id: caseB.id,
    account_restriction_id: null,
    action_type: "warn_user",
    scope: "user",
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const actionB =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: actionBBody },
    );
  typia.assert<ICommunityPlatformModerationAction>(actionB);

  // Helper to create an appeal for the *currently authenticated member* against a specific action
  const createAppealForCurrentMember = async (
    targetAction: ICommunityPlatformModerationAction,
    justificationPrefix: string,
  ): Promise<ICommunityPlatformAppeal> => {
    const body = {
      moderation_action_id: targetAction.id,
      justification: `${justificationPrefix}: ${RandomGenerator.paragraph({
        sentences: 4,
      })}`,
    } satisfies ICommunityPlatformAppeal.ICreate;

    const appeal =
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformAppeal>(appeal);
    return appeal;
  };

  // 4. Register member1 and create its appeals on action A1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const memberBasePassword = "memberP@ssw0rd";

  const member1JoinBody = {
    username: RandomGenerator.name(1),
    email: member1Email,
    password: `${memberBasePassword}1`,
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member1Authorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: member1JoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member1Authorized);

  const member1AppealA1_1 = await createAppealForCurrentMember(
    actionA,
    "member1 appeal A1 #1",
  );
  const member1AppealA1_2 = await createAppealForCurrentMember(
    actionA,
    "member1 appeal A1 #2",
  );

  // 5. Register member2 and create its appeal on action B1
  const member2Email = typia.random<string & tags.Format<"email">>();

  const member2JoinBody = {
    username: RandomGenerator.name(1),
    email: member2Email,
    password: `${memberBasePassword}2`,
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member2Authorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: member2JoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member2Authorized);

  const member2AppealB1 = await createAppealForCurrentMember(
    actionB,
    "member2 appeal B1 #1",
  );

  // 6. Switch back to adminUser via explicit login to ensure admin context
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin",
    referrer: "https://example.com/admin/login",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult = await api.functional.auth.adminUser.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginResult);

  // 7. Global appeals index filtered by moderationActionId = actionA.id
  const actionAFilterBody = {
    page: 0,
    limit: 50,
    sortField: "created_at",
    sortOrder: "desc",
    statuses: ["pending"],
    moderationActionId: actionA.id,
  } satisfies ICommunityPlatformAppeal.IRequest;

  const actionAFilteredPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: actionAFilterBody,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(actionAFilteredPage);

  // Ensure all returned appeals reference actionA and none reference actionB
  for (const item of actionAFilteredPage.data) {
    TestValidator.equals(
      "appeal filtered by action A should reference actionA.id",
      item.moderation_action_id,
      actionA.id,
    );
    TestValidator.notEquals(
      "appeal filtered by action A must not reference actionB.id",
      item.moderation_action_id,
      actionB.id,
    );
  }

  // Ensure both member1 A1 appeals are present in the result set
  const allActionAIds = actionAFilteredPage.data.map((a) => a.id);
  TestValidator.predicate(
    "first member1 appeal on A1 must be present in A1-filtered index",
    allActionAIds.includes(member1AppealA1_1.id),
  );
  TestValidator.predicate(
    "second member1 appeal on A1 must be present in A1-filtered index",
    allActionAIds.includes(member1AppealA1_2.id),
  );

  // 8. Global appeals index filtered by moderationActionId = actionB.id
  const actionBFilterBody = {
    page: 0,
    limit: 50,
    sortField: "created_at",
    sortOrder: "desc",
    statuses: ["pending"],
    moderationActionId: actionB.id,
  } satisfies ICommunityPlatformAppeal.IRequest;

  const actionBFilteredPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: actionBFilterBody,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(actionBFilteredPage);

  for (const item of actionBFilteredPage.data) {
    TestValidator.equals(
      "appeal filtered by action B should reference actionB.id",
      item.moderation_action_id,
      actionB.id,
    );
    TestValidator.notEquals(
      "appeal filtered by action B must not reference actionA.id",
      item.moderation_action_id,
      actionA.id,
    );
  }

  const allActionBIds = actionBFilteredPage.data.map((a) => a.id);
  TestValidator.predicate(
    "member2 appeal on B1 must be present in B1-filtered index",
    allActionBIds.includes(member2AppealB1.id),
  );

  // 9. Case-based appeals index for caseA via PATCH /moderationCases/{caseKey}/appeals
  const caseAIndexBody = {
    page: 0,
    limit: 50,
    sortField: "created_at",
    sortOrder: "desc",
    statuses: ["pending"],
  } satisfies ICommunityPlatformAppeal.IRequest;

  const caseAAppealsPage =
    await api.functional.communityPlatform.adminUser.moderationCases.appeals.index(
      connection,
      {
        caseKey: caseA.case_key,
        body: caseAIndexBody,
      },
    );
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(caseAAppealsPage);

  // Global appeals index filtered by moderationCaseId = caseA.id
  const globalCaseAFilterBody = {
    page: 0,
    limit: 50,
    sortField: "created_at",
    sortOrder: "desc",
    statuses: ["pending"],
    moderationCaseId: caseA.id,
  } satisfies ICommunityPlatformAppeal.IRequest;

  const globalCaseAFilteredPage =
    await api.functional.communityPlatform.adminUser.appeals.index(connection, {
      body: globalCaseAFilterBody,
    });
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(globalCaseAFilteredPage);

  const caseAAppealIds = caseAAppealsPage.data.map((a) => a.id);
  const globalCaseAAppealIds = globalCaseAFilteredPage.data.map((a) => a.id);

  // Check that every case-scoped appeal id is included in global case-filtered index
  for (const id of caseAAppealIds) {
    TestValidator.predicate(
      "all case-scoped appeals must be present in global case-filtered index",
      globalCaseAAppealIds.includes(id),
    );
  }

  // 10. Combined filters: moderationActionId + statuses + createdFrom/createdTo
  const allCreatedAtStrings = actionAFilteredPage.data.map((a) => a.created_at);

  if (allCreatedAtStrings.length > 0) {
    const sortedCreatedAt = [...allCreatedAtStrings].sort();
    const minCreatedAt = sortedCreatedAt[0];
    const maxCreatedAt = sortedCreatedAt[sortedCreatedAt.length - 1];

    const combinedFilterBody = {
      page: 0,
      limit: 50,
      sortField: "created_at",
      sortOrder: "desc",
      statuses: ["pending"],
      moderationActionId: actionA.id,
      createdFrom: minCreatedAt,
      createdTo: maxCreatedAt,
    } satisfies ICommunityPlatformAppeal.IRequest;

    const combinedFilteredPage =
      await api.functional.communityPlatform.adminUser.appeals.index(
        connection,
        {
          body: combinedFilterBody,
        },
      );
    typia.assert<IPageICommunityPlatformAppeal.ISummary>(combinedFilteredPage);

    for (const item of combinedFilteredPage.data) {
      // Ensure action filter applied
      TestValidator.equals(
        "combined filter: appeal moderation_action_id must equal actionA.id",
        item.moderation_action_id,
        actionA.id,
      );

      // Ensure status filter applied
      TestValidator.equals(
        "combined filter: appeal status must be pending",
        item.status,
        "pending",
      );

      // Ensure createdAt within range (lexicographical comparison of ISO 8601)
      TestValidator.predicate(
        "combined filter: created_at must be >= createdFrom",
        item.created_at >= minCreatedAt,
      );
      TestValidator.predicate(
        "combined filter: created_at must be <= createdTo",
        item.created_at <= maxCreatedAt,
      );
    }
  }
}
