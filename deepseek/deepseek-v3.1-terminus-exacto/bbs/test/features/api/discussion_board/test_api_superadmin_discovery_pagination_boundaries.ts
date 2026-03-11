import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_discovery_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Maximum limit value (100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 2: Minimum limit value (1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit is 1",
    minLimitResponse.pagination.limit,
    1,
  );
  // Test 3: Large page number (should return valid pagination structure)
  const largePageResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          page: 100 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(largePageResponse);
  TestValidator.predicate(
    "large page returns valid pagination",
    largePageResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "large page returns valid records count",
    largePageResponse.pagination.records >= 0,
  );
  // Test 4: Empty search results with non-matching query
  const emptySearchResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_search_query_that_wont_match_anything_12345",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.predicate(
    "empty search has valid pagination structure",
    emptySearchResponse.pagination.pages >= 0 &&
      emptySearchResponse.pagination.records >= 0 &&
      emptySearchResponse.pagination.current >= 1 &&
      emptySearchResponse.pagination.limit >= 1,
  );
  // Test 5: Default parameters (no page/limit specified)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has valid pagination",
    defaultResponse.pagination.current >= 1 &&
      defaultResponse.pagination.limit >= 1 &&
      defaultResponse.pagination.limit <= 100 &&
      defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0,
  );
  // Test 6: Verify pagination metadata consistency
  const consistentResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(consistentResponse);
  // Validate pagination calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    consistentResponse.pagination.records / consistentResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    consistentResponse.pagination.pages,
    expectedPages,
  );
  // Validate data length doesn't exceed limit
  TestValidator.predicate(
    "data length <= limit",
    consistentResponse.data.length <= consistentResponse.pagination.limit,
  );
}
