import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_sorted_best_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe moderator to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    moderatorConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments on the post (5 comments with varied content)
  const comments = await ArrayUtil.asyncRepeat(5, async () => {
    const comment =
      await generate_random_reddit_like_member_posts_comments_create(
        moderatorConnection,
        {
          params: {
            postId: post.id,
          },
        },
      );
    return comment;
  });
  typia.assert(comments);
  // 6. Retrieve comments sorted by BEST with pagination
  const sortedComments =
    await api.functional.redditLike.moderator.posts.comments.sorted.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          sort: "BEST",
          page: 1,
          limit: 20,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(sortedComments);
  // 7. Validate pagination structure and results
  TestValidator.equals(
    "page current is 1",
    sortedComments.pagination.current,
    1,
  );
  TestValidator.equals("page limit is 20", sortedComments.pagination.limit, 20);
  TestValidator.predicate(
    "records count matches comments created",
    sortedComments.pagination.records === comments.length,
  );
  TestValidator.predicate(
    "has pagination pages",
    sortedComments.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data array has correct length",
    sortedComments.data.length === comments.length,
  );
  TestValidator.predicate(
    "all comments are not deleted",
    sortedComments.data.every((c) => !c.is_deleted),
  );
}
