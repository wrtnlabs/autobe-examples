import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleReaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_reactions_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create filter criteria that guarantees no matching data
  const filterCriteria: IDiscussionBoardArticleReaction.IRequest = {
    reaction_type: "nonexistent_reaction_type",
    created_at_start: new Date("2100-01-01T00:00:00.000Z").toISOString(),
    created_at_end: new Date("2100-12-31T23:59:59.999Z").toISOString(),
    page: 1,
    limit: 10,
  };
  // Call the reactions analytics endpoint
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.reactions.analytics.index(
      superAdminConnection,
      {
        body: filterCriteria,
      },
    );
  // Validate the response structure
  typia.assert(analyticsResponse);
  // Verify pagination metadata for empty result set
  TestValidator.equals(
    "current page should be 1",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    analyticsResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "records should be 0",
    analyticsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0",
    analyticsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    analyticsResponse.data.length,
    0,
  );
}
