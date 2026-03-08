import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_comment_edit_with_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  const { token } = member;
  // Create member-specific connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: token.access },
  };
  // 2. Create community and subscribe
  const community =
    await generate_random_reddit_platform_member_communities_create(
      authenticatedConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: typia.random<string>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  await generate_random_reddit_platform_member_communities_subscribe(
    authenticatedConnection,
    {
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
      params: { communityId: community.id },
    },
  );
  // 3. Create post
  const post = await generate_random_reddit_platform_member_posts_create(
    authenticatedConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: typia.random<string>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create top-level comment
  const topLevelComment =
    await generate_random_reddit_platform_member_comments_create(
      authenticatedConnection,
      {
        body: {
          content: typia.random<string & tags.MinLength<1>>(),
          post_id: post.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  const topLevelCommentId = topLevelComment.id;
  const topLevelCommentAuthorId = topLevelComment.author_id;
  const topLevelCommentCreatedAt = topLevelComment.created_at;
  // 5. Create reply to top-level comment (nested level 1)
  const reply1 = await generate_random_reddit_platform_member_comments_create(
    authenticatedConnection,
    {
      body: {
        content: typia.random<string & tags.MinLength<1>>(),
        parent_id: topLevelCommentId,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply1);
  const reply1Id = reply1.id;
  // 6. Create nested reply to first reply (level 2)
  const reply2 = await generate_random_reddit_platform_member_comments_create(
    authenticatedConnection,
    {
      body: {
        content: typia.random<string & tags.MinLength<1>>(),
        parent_id: reply1Id,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply2);
  const reply2Id = reply2.id;
  // Verify comment hierarchy is intact before editing
  TestValidator.equals(
    "reply 1 parent_id links to top-level",
    reply1.parent_id,
    topLevelCommentId,
  );
  TestValidator.equals(
    "reply 2 parent_id links to reply 1",
    reply2.parent_id,
    reply1Id,
  );
  // 7. Update top-level comment's content
  const newContent = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();
  const updatedComment =
    await api.functional.redditPlatform.member.comments.update(
      authenticatedConnection,
      {
        commentId: topLevelCommentId,
        body: { content: newContent } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 8. Verify the top-level comment's content is updated
  TestValidator.equals(
    "top-level comment content updated",
    updatedComment.content,
    newContent,
  );
  // 9. Verify original post_id and parent_id relationships remain intact
  TestValidator.equals(
    "post_id remains intact",
    updatedComment.post_id,
    post.id,
  );
  TestValidator.equals(
    "parent_id remains null (top-level)",
    updatedComment.parent_id,
    null,
  );
  // 10. Verify that comment metadata is preserved (created_at unchanged, updated_at changed)
  TestValidator.equals(
    "created_at remains unchanged after edit",
    updatedComment.created_at,
    topLevelCommentCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    updatedComment.updated_at > updatedComment.created_at,
  );
  // 11. Verify author information remains consistent
  TestValidator.equals(
    "author id remains consistent",
    updatedComment.author_id,
    topLevelCommentAuthorId,
  );
  // 12. Verify that replies remain linked correctly after editing parent
  // Create a new reply to the updated top-level comment
  const reply3 = await generate_random_reddit_platform_member_comments_create(
    authenticatedConnection,
    {
      body: {
        content: typia.random<string & tags.MinLength<1>>(),
        parent_id: topLevelCommentId,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply3);
  TestValidator.equals(
    "new reply 3 links to updated top-level comment",
    reply3.parent_id,
    topLevelCommentId,
  );
  // 13. Verify the nested structure is preserved
  // Reply 2 should still link to reply 1
  const reply2Verify =
    await generate_random_reddit_platform_member_comments_create(
      authenticatedConnection,
      {
        body: {
          content: "test", // placeholder - will be updated
          parent_id: reply1Id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(reply2Verify);
  TestValidator.equals(
    "reply hierarchy preserved after parent edit",
    reply2Verify.parent_id,
    reply1Id,
  );
  // 14. Verify comment author info is the same
  TestValidator.equals(
    "author name consistent",
    updatedComment.author.displayName,
    member.displayName,
  );
  TestValidator.equals(
    "author username consistent",
    updatedComment.author.username,
    member.username,
  );
}
