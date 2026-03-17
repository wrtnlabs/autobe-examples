import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_update_multiple_edits_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create initial comment on the post
  const initialBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: initialBody,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  const originalUpdatedAt = comment.updatedAt;
  // 6. First edit - update to version 1
  const version1Body = RandomGenerator.paragraph({ sentences: 4 });
  const edit1 =
    await api.functional.redditPlatform.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: version1Body,
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(edit1);
  TestValidator.equals("edit 1 body matches", edit1.body, version1Body);
  TestValidator.notEquals(
    "edit 1 timestamp changed",
    edit1.updatedAt,
    originalUpdatedAt,
  );
  // 7. Second edit - update to version 2
  const version2Body = RandomGenerator.paragraph({ sentences: 5 });
  const edit2 =
    await api.functional.redditPlatform.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: version2Body,
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(edit2);
  TestValidator.equals("edit 2 body matches", edit2.body, version2Body);
  TestValidator.notEquals(
    "edit 2 timestamp changed",
    edit2.updatedAt,
    edit1.updatedAt,
  );
  TestValidator.predicate(
    "edit 2 after edit 1",
    edit2.updatedAt > edit1.updatedAt,
  );
  // 8. Third edit - update to version 3
  const version3Body = RandomGenerator.paragraph({ sentences: 6 });
  const edit3 =
    await api.functional.redditPlatform.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: version3Body,
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(edit3);
  TestValidator.equals("edit 3 body matches", edit3.body, version3Body);
  TestValidator.notEquals(
    "edit 3 timestamp changed",
    edit3.updatedAt,
    edit2.updatedAt,
  );
  TestValidator.predicate(
    "edit 3 after edit 2",
    edit3.updatedAt > edit2.updatedAt,
  );
  // 9. Verify final comment state
  TestValidator.equals("final body is version 3", edit3.body, version3Body);
}