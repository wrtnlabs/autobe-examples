import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_posts_vote_scores_pagination_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Minimum page limit (1 record per page)
  const minLimitResult =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1>
          >(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit pagination limit",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit current page valid",
    minLimitResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "min limit records non-negative",
    minLimitResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "min limit pages non-negative",
    minLimitResult.pagination.pages >= 0,
  );
  // Test 2: Maximum page limit (100 records per page)
  const maxLimitResult =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit current page valid",
    maxLimitResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "max limit records non-negative",
    maxLimitResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "max limit pages non-negative",
    maxLimitResult.pagination.pages >= 0,
  );
  // Test 3: Default pagination behavior (no page/limit specified)
  const defaultResult =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default current page valid",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default limit valid",
    defaultResult.pagination.limit >= 1 &&
      defaultResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "default records non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pages non-negative",
    defaultResult.pagination.pages >= 0,
  );
  // Test 4: Page 0 edge case (should default to page 1)
  const pageZeroResult =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          page: 0 satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(pageZeroResult);
  TestValidator.predicate(
    "page 0 results in valid page",
    pageZeroResult.pagination.current >= 1,
  );
  // Test 5: Pagination metadata accuracy
  const testPage = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const testLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const metadataResult =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          page: testPage,
          limit: testLimit,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(metadataResult);
  TestValidator.equals(
    "page matches request",
    metadataResult.pagination.current,
    testPage,
  );
  TestValidator.equals(
    "limit matches request",
    metadataResult.pagination.limit,
    testLimit,
  );
  TestValidator.predicate(
    "records count non-negative",
    metadataResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation correct",
    metadataResult.pagination.pages ===
      Math.ceil(
        metadataResult.pagination.records / metadataResult.pagination.limit,
      ),
  );
  // Test 6: Consistent pagination across multiple pages
  if (metadataResult.pagination.pages > 1) {
    const page1Result =
      await api.functional.communityPlatform.admin.posts.vote_scores.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: testLimit,
          } satisfies ICommunityPlatformPostVoteScore.IRequest,
        },
      );
    typia.assert(page1Result);
    const page2Result =
      await api.functional.communityPlatform.admin.posts.vote_scores.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: testLimit,
          } satisfies ICommunityPlatformPostVoteScore.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "consistent total records across pages",
      page1Result.pagination.records,
      page2Result.pagination.records,
    );
    TestValidator.equals(
      "consistent total pages across pages",
      page1Result.pagination.pages,
      page2Result.pagination.pages,
    );
  }
  // Test 7: Empty result set with impossible filters
  const emptyResult =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          min_total_score: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000000> &
              tags.Maximum<2147483647>
          >(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty result set records non-negative",
    emptyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty result set pages non-negative",
    emptyResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty result set data length valid",
    emptyResult.data.length >= 0,
  );
}
