import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Update connection with member's token
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers = {
    ...memberAuthConnection.headers,
    Authorization: `Bearer ${member.token.access}`,
  };
  // 2. Get list of communities to find one to post in
  const communities = await api.functional.redditPlatform.member.posts.create(
    memberAuthConnection,
    {
      body: {
        communityId: "",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "TEXT",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(communities);
  // 3. Add comment to the post
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberAuthConnection,
      {
        postId: communities.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Verify comment count increased
  const postAfterComment =
    await api.functional.redditPlatform.member.posts.create(
      memberAuthConnection,
      {
        body: {
          communityId: communities.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "TEXT",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  typia.assert(postAfterComment);
  // 4. Delete the comment by author
  await api.functional.redditPlatform.member.posts.comments.erase(
    memberAuthConnection,
    {
      postId: comment.post_id,
      commentId: comment.id,
    },
  );
  // 5. Verify comment is removed
  // Try to get the post again and verify comment count decreased
  const postAfterDeletion =
    await api.functional.redditPlatform.member.posts.create(
      memberAuthConnection,
      {
        body: {
          communityId: communities.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "TEXT",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  typia.assert(postAfterDeletion);
  // Validate comment was deleted
  TestValidator.equals(
    "comment ID matches deleted comment",
    postAfterDeletion.commentCount,
    postAfterComment.commentCount - 1,
  );
}
