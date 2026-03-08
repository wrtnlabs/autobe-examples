import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_retrieval_link_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (member becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the created community (required before creating posts)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a link-type post with title and external URL
  const linkUrl = typia.random<string & tags.Format<"uri">>();
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: postTitle,
        contentType: "link",
        textContent: null,
        linkUrl: linkUrl,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve the post by ID
  const retrieved = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate response structure and content
  TestValidator.equals("post id matches", retrieved.id, post.id);
  TestValidator.equals("title matches", retrieved.title, postTitle);
  TestValidator.equals("content type is link", retrieved.content_type, "link");
  TestValidator.equals("link url matches", retrieved.link_url, typia.assert<string & tags.Format<"url">>(linkUrl));
  TestValidator.equals(
    "text content is null for link post",
    retrieved.text_content,
    null,
  );
  TestValidator.equals(
    "image url is null for link post",
    retrieved.image_url,
    null,
  );
  TestValidator.equals(
    "score reflects automatic self-upvote",
    retrieved.score,
    1,
  );
  TestValidator.equals(
    "comment count is zero initially",
    retrieved.comment_count,
    0,
  );
  TestValidator.equals("author id matches", retrieved.author.id, member.id);
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.predicate(
    "created_at is present",
    retrieved.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrieved.updated_at !== null,
  );
  TestValidator.equals(
    "deleted_at is null for active post",
    retrieved.deleted_at,
    null,
  );
}