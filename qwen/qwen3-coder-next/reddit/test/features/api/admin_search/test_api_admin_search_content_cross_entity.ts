import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_search_content_cross_entity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      username: "admin_user",
      display_name: "Admin User",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Test search functionality across entity types
  // 2.1 Search with partial community name
  const searchTech =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          search: "tech",
          sort: "relevance" as const,
          limit: 20,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
  typia.assert(searchTech);
  // 2.2 Search with type filter for posts only
  const searchPostsOnly =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          search: "test",
          type: "post" as const,
          sort: "relevance" as const,
          limit: 10,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
  typia.assert(searchPostsOnly);
  // 2.3 Search with type filter for communities only
  const searchCommunitiesOnly =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          search: "community",
          type: "community" as const,
          sort: "newest" as const,
          limit: 10,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
  typia.assert(searchCommunitiesOnly);
  // 2.4 Search with no results
  const searchNoResults =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          search: "nonexistent12345xyz",
          sort: "relevance" as const,
          limit: 10,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
  typia.assert(searchNoResults);
  TestValidator.equals("no results count", searchNoResults.data.length, 0);
  // 2.5 Test pagination with page parameter
  const paginatedSearch =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          search: "tech",
          sort: "relevance" as const,
          limit: 5,
          page: 1,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination current valid",
    paginatedSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginatedSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    paginatedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    paginatedSearch.pagination.pages >= 0,
  );
  // 2.6 Test pagination with limit only
  const limitOnlySearch =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          search: "test",
          sort: "newest" as const,
          limit: 3,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
  typia.assert(limitOnlySearch);
  TestValidator.equals(
    "limit respected",
    limitOnlySearch.data.length <= 3,
    true,
  );
  // 2.7 Test sorting by newest
  const newestSearch =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          search: "test",
          sort: "newest" as const,
          limit: 10,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
  typia.assert(newestSearch);
  // 2.8 Verify result types are correct
  for (const result of searchTech.data) {
    TestValidator.predicate(
      "valid entity type",
      ["post", "comment", "community"].includes(result.entity_type),
    );
    TestValidator.predicate("valid score", result.score >= 0);
    TestValidator.predicate("valid hit count", result.hit_count >= 0);
    TestValidator.predicate(
      "valid content length",
      result.content.length <= 200,
    );
  }
}
