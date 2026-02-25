import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_search_empty_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Test search with empty criteria (no filters)
  const searchResult =
    await api.functional.communityPlatform.moderator.posts.search(
      moderatorConnection,
      {
        body: {} satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure - only basic business logic validation
  TestValidator.predicate(
    "pagination has valid current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array is present
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);
  // Validate each post summary structure using typia.assert only
  for (const post of searchResult.data) {
    typia.assert(post);
  }
  // Test pagination with specific page and limit
  const paginatedSearch =
    await api.functional.communityPlatform.moderator.posts.search(
      moderatorConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate pagination parameters - business logic only
  TestValidator.equals(
    "page matches request",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit within bounds",
    paginatedSearch.pagination.limit >= 1 &&
      paginatedSearch.pagination.limit <= 100,
  );
}
