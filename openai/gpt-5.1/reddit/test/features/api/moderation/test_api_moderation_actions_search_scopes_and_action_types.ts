import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

export async function test_api_moderation_actions_search_scopes_and_action_types(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized context
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a moderation case under this admin
  const caseBody = typia.random<ICommunityPlatformModerationCase.ICreate>();
  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: caseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Perform a broad search for actions on this case to have a baseline set
  const broadSearchBody: ICommunityPlatformModerationAction.IRequest = {
    moderationCaseId: moderationCase.id,
    page: 1,
    pageSize: 100,
  };
  const broadPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.actions.index(
      connection,
      {
        body: broadSearchBody,
      },
    );
  typia.assert(broadPage);

  // 4. First filtered search: scopes = ["user"], actionTypes = ["restrict_account"]
  const narrowRequestBody: ICommunityPlatformModerationAction.IRequest = {
    moderationCaseId: moderationCase.id,
    page: 1,
    pageSize: 100,
    scopes: ["user"],
    actionTypes: ["restrict_account"],
  };

  const narrowPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.actions.index(
      connection,
      {
        body: narrowRequestBody,
      },
    );
  typia.assert(narrowPage);

  const narrowActions: ICommunityPlatformModerationAction.ISummary[] =
    narrowPage.data;

  // Validate: all returned actions match the narrow filters when results exist
  for (const action of narrowActions) {
    TestValidator.predicate(
      "narrow search: scope must be 'user'",
      action.scope === "user",
    );
    TestValidator.predicate(
      "narrow search: action_type must be 'restrict_account'",
      action.action_type === "restrict_account",
    );
  }

  // 5. Second filtered search: scopes = ["user", "content"], actionTypes including both
  const broadFilteredRequestBody: ICommunityPlatformModerationAction.IRequest =
    {
      moderationCaseId: moderationCase.id,
      page: 1,
      pageSize: 100,
      scopes: ["user", "content"],
      actionTypes: ["restrict_account", "remove_content"],
    };

  const broadFilteredPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.actions.index(
      connection,
      {
        body: broadFilteredRequestBody,
      },
    );
  typia.assert(broadFilteredPage);

  const broadFilteredActions: ICommunityPlatformModerationAction.ISummary[] =
    broadFilteredPage.data;

  // Validate: all returned actions respect the broader filters
  for (const action of broadFilteredActions) {
    TestValidator.predicate(
      "broad search: scope must be in ['user', 'content']",
      broadFilteredRequestBody.scopes!.includes(action.scope),
    );
    TestValidator.predicate(
      "broad search: action_type must be in ['restrict_account', 'remove_content']",
      broadFilteredRequestBody.actionTypes!.includes(action.action_type),
    );
  }

  // 6. Subset relationship: every narrow result should appear in the broad-filtered set
  const broadIds = new Set(broadFilteredActions.map((a) => a.id));
  for (const action of narrowActions) {
    TestValidator.predicate(
      "narrow results should be subset of broad-filtered results by id",
      broadIds.has(action.id),
    );
  }

  // Basic sanity: pagination metadata matches the data length constraints
  TestValidator.predicate(
    "broad page: records count should be >= data length",
    broadPage.pagination.records >= broadPage.data.length,
  );
  TestValidator.predicate(
    "narrow page: records count should be >= data length",
    narrowPage.pagination.records >= narrowPage.data.length,
  );
  TestValidator.predicate(
    "broad-filtered page: records count should be >= data length",
    broadFilteredPage.pagination.records >= broadFilteredPage.data.length,
  );
}
