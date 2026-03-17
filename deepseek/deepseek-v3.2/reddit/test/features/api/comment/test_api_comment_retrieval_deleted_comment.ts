import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_retrieval_deleted_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const memberAuthorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: typia.random<string & typia.tags.Format<"password">>(),
      username: typia.random<string>(),
      nickname: typia.random<string>(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuthorized);
  // Create actor-specific connection from authorized member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuthorized.token.access}`,
  };
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia
            .random<string>()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 8),
          description: typia.random<string>(),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id as string & typia.tags.Format<"uuid">,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community (text post for simplicity)
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: typia.random<string>(),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: typia.random<string>(),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on the post
  const commentContent = typia.random<string>();
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: commentContent as string & typia.tags.MinLength<1>,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Delete the comment
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 7. Retrieve deleted comment
  const retrievedComment =
    await api.functional.communityPlatform.posts.comments.at(memberConnection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  // Validate business rules
  TestValidator.equals(
    "retrieved comment ID matches",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content preserved after deletion",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "author information present",
    retrievedComment.author.id,
    memberAuthorized.id,
  );
  TestValidator.notEquals(
    "deleted_at timestamp is populated",
    retrievedComment.deleted_at,
    null,
  );
  TestValidator.predicate("deleted_at is valid ISO date-time", () => {
    if (retrievedComment.deleted_at === null) return false;
    const date = new Date(retrievedComment.deleted_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "post reference preserved",
    retrievedComment.post.id,
    post.id,
  );
}
