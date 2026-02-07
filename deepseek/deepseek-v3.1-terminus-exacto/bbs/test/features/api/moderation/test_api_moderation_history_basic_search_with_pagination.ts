import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_history_basic_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super admin
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Test basic search without filters
  const searchRequest: IDiscussionBoardModeratedContentHistory.IRequest = {
    page: 1,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
    >(),
  };
  const response =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      { body: searchRequest },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "total records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data structure consistency
  TestValidator.equals(
    "data array length matches limit",
    response.data.length,
    Math.min(response.pagination.limit, response.pagination.records),
  );
  // Test pagination with different page
  if (response.pagination.pages > 1) {
    const secondPageRequest: IDiscussionBoardModeratedContentHistory.IRequest =
      {
        page: 2,
        limit: searchRequest.limit,
      };
    const secondPageResponse =
      await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
        superAdminConnection,
        { body: secondPageRequest },
      );
    typia.assert(secondPageResponse);
    // Validate second page pagination consistency
    TestValidator.equals(
      "second page current page",
      secondPageResponse.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPageResponse.pagination.limit,
      searchRequest.limit,
    );
    TestValidator.equals(
      "total records consistent",
      secondPageResponse.pagination.records,
      response.pagination.records,
    );
  }
  // Test with different limit size
  const differentLimitRequest: IDiscussionBoardModeratedContentHistory.IRequest =
    {
      page: 1,
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<30>
      >(),
    };
  const differentLimitResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      { body: differentLimitRequest },
    );
  typia.assert(differentLimitResponse);
  // Validate different limit pagination
  TestValidator.equals(
    "different limit current page",
    differentLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "different limit value",
    differentLimitResponse.pagination.limit,
    differentLimitRequest.limit,
  );
  TestValidator.equals(
    "total records remains consistent",
    differentLimitResponse.pagination.records,
    response.pagination.records,
  );
}
