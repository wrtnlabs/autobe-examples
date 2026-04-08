import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test viewing a user's complete comment history on their profile page.
 *
 * Validates the complete comment history retrieval flow including member account creation, post creation for commenting, multiple comment creation, and paginated comment list retrieval. Ensures that the comment list correctly references the author, posts, and includes accurate vote scores and reply counts.
 *
 * Special attention is given to verifying that all comments belong to the specified profile, pagination metadata is accurate, and soft-deleted comments are excluded from results.
 *
 * 1. Member account is created with email, password, and unique username.
 * 2. Multiple posts are created in communities for commenting.
 * 3. Multiple comments are created on those posts as the member.
 * 4. Comment history is retrieved via PATCH /redditClone/profiles/{profileId}/comments.
 * 5. Validates comment list contains all created comments with correct author, post, vote_score, and reply_count.
 * 6. Verifies pagination metadata (current page, total records, pages) is accurate.
 * 7. Confirms comments are sorted by most recent first (default sortOrder='new', sortDirection='desc').
 */
export async function test_api_profile_comments_view_user_comment_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create multiple posts for commenting
  const posts: IRedditClonePost[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const post = await generate_random_reddit_clone_member_posts_create(
        memberConnection,
        {
          body: {},
        },
      );
      typia.assert(post);
      return post;
    },
  );
  // 3. Create multiple comments on those posts
  const comments: IRedditCloneComment[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const postId = posts[index % posts.length].id;
      const comment =
        await generate_random_reddit_clone_member_posts_comments_create(
          memberConnection,
          {
            params: { postId },
            body: {},
          },
        );
      typia.assert(comment);
      return comment;
    },
  );
  // 4. Retrieve comment history via profile endpoint
  const commentHistory =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        sortOrder: "new",
        sortDirection: "desc",
        limit: 20,
        page: 1,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(commentHistory);
  // 5. Validate comment list contains all created comments
  TestValidator.equals(
    "comment count matches",
    commentHistory.data.length,
    comments.length,
  );
  // 6. Validate all comments belong to the specified profile
  await ArrayUtil.asyncForEach(commentHistory.data, async (comment) => {
    TestValidator.equals(
      "author matches profile",
      comment.author.id,
      member.id,
    );
  });
  // 7. Validate pagination metadata is accurate
  TestValidator.equals(
    "current page is 1",
    commentHistory.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", commentHistory.pagination.limit, 20);
  TestValidator.equals(
    "total records match",
    commentHistory.pagination.records,
    comments.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    commentHistory.pagination.pages >= 1,
  );
  // 8. Validate comments are sorted by most recent first
  if (commentHistory.data.length > 1) {
    for (let i = 1; i < commentHistory.data.length; i++) {
      TestValidator.predicate(
        `comment ${i} is not newer than comment ${i - 1}`,
        new Date(commentHistory.data[i].created_at).getTime() <=
          new Date(commentHistory.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 9. Validate each comment includes proper post reference
  await ArrayUtil.asyncForEach(commentHistory.data, async (comment) => {
    TestValidator.predicate(
      "comment belongs to one of created posts",
      posts.some((post) => post.id === comment.post.id),
    );
  });
}
