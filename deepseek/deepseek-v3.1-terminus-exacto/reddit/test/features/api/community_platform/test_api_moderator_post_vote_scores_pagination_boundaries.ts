import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_vote_scores_pagination_boundaries(
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
  // Test 1: First page with small limit
  const firstPageResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // Test 2: Middle page with standard limit
  const middlePageResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 5,
          limit: 25,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(middlePageResponse);
  // Test 3: Final page with remaining records
  const totalRecords = firstPageResponse.pagination.records;
  const totalPages = firstPageResponse.pagination.pages;
  if (totalPages > 0) {
    const finalPageResponse =
      await api.functional.communityPlatform.moderator.posts.vote_scores.index(
        moderatorConnection,
        {
          body: {
            page: totalPages,
            limit: 10,
          } satisfies ICommunityPlatformPostVoteScore.IRequest,
        },
      );
    typia.assert(finalPageResponse);
  }
  // Test 4: Page beyond total pages (should return empty data array)
  const beyondPageResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: totalPages + 10,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  // Test 5: Minimum limit value (1)
  const minLimitResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  // Test 6: Maximum limit value (100)
  const maxLimitResponse =
    await api.functional.communityPlatform.moderator.posts.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
}
