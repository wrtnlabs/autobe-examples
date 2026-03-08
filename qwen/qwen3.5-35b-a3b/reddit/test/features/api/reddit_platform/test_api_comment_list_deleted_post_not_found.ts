import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_list_deleted_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community and subscribe
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MaxLength<100>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityId: community.id,
      body: { confirmSubscription: true },
    },
  );
  // 3. Create post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        postType: "TEXT" as const,
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      },
    },
  );
  typia.assert(post);
  // 4. Create comments
  const comments: IRedditPlatformComment[] = [];
  for (let i = 0; i < 3; i++) {
    const comment = await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
    typia.assert(comment);
    comments.push(comment);
  }
  // 5. Verify comments accessible on active post (using member connection)
  const activeComments =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
      },
    });
  typia.assert(activeComments);
  TestValidator.equals(
    "active post comments count",
    activeComments.data.length,
    3,
  );
  // 6. Soft-delete post
  await api.functional.redditPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 7-8. Attempt to retrieve comments on deleted post (should fail with 404)
  await TestValidator.httpError("deleted post returns 404", 404, async () => {
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
      },
    });
  });
  // 9-10. Test with non-existent postId (should fail with 404)
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent post returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.posts.comments.index(
        memberConnection,
        {
          postId: fakePostId,
          body: {
            page: 1,
            limit: 20,
          },
        },
      );
    },
  );
}
