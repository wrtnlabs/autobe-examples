import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comments_vote_scores_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Test sorting by score (descending)
  const scoreDescResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          sort_by: "score",
          sort_order: "desc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<20>
          >(),
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(scoreDescResponse);
  // Test sorting by score (ascending)
  const scoreAscResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          sort_by: "score",
          sort_order: "asc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<20>
          >(),
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(scoreAscResponse);
  // Test sorting by upvote_count (descending)
  const upvotesDescResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          sort_by: "upvote_count",
          sort_order: "desc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<20>
          >(),
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(upvotesDescResponse);
  // Test sorting by last_updated_at (ascending)
  const updatedAscResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          sort_by: "last_updated_at",
          sort_order: "asc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<20>
          >(),
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(updatedAscResponse);
  // Test pagination with multiple pages
  const page1Response =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          sort_by: "score",
          sort_order: "desc",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          sort_by: "score",
          sort_order: "desc",
          limit: 5,
          page: 2,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(page2Response);
  // Test empty result scenario with impossible filter
  const emptyResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          minimum_score: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000000> &
              tags.Maximum<2147483647>
          >(),
          sort_by: "score",
          sort_order: "desc",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate pagination metadata for empty results
  TestValidator.equals(
    "total records should be 0 for impossible filter",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0 for empty result",
    emptyResponse.pagination.pages,
    0,
  );
  // Validate sorting consistency across pages when data exists
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1MinScore = Math.min(
      ...page1Response.data.map((item) => item.score),
    );
    const page2MaxScore = Math.max(
      ...page2Response.data.map((item) => item.score),
    );
    TestValidator.predicate(
      "page 1 scores should be >= page 2 scores in descending order",
      page1MinScore >= page2MaxScore,
    );
  }
  // Validate sorting order for score descending when data exists
  if (scoreDescResponse.data.length > 1) {
    for (let i = 1; i < scoreDescResponse.data.length; i++) {
      TestValidator.predicate(
        "scores should be in descending order",
        scoreDescResponse.data[i - 1].score >= scoreDescResponse.data[i].score,
      );
    }
  }
  // Validate sorting order for score ascending when data exists
  if (scoreAscResponse.data.length > 1) {
    for (let i = 1; i < scoreAscResponse.data.length; i++) {
      TestValidator.predicate(
        "scores should be in ascending order",
        scoreAscResponse.data[i - 1].score <= scoreAscResponse.data[i].score,
      );
    }
  }
  // Validate sorting order for upvote_count descending when data exists
  if (upvotesDescResponse.data.length > 1) {
    for (let i = 1; i < upvotesDescResponse.data.length; i++) {
      TestValidator.predicate(
        "upvote counts should be in descending order",
        upvotesDescResponse.data[i - 1].upvote_count >=
          upvotesDescResponse.data[i].upvote_count,
      );
    }
  }
  // Validate sorting order for last_updated_at ascending when data exists
  if (updatedAscResponse.data.length > 1) {
    for (let i = 1; i < updatedAscResponse.data.length; i++) {
      const prevDate = new Date(updatedAscResponse.data[i - 1].last_updated_at);
      const currDate = new Date(updatedAscResponse.data[i].last_updated_at);
      TestValidator.predicate(
        "dates should be in ascending order",
        prevDate <= currDate,
      );
    }
  }
}
