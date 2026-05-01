import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_comments_reply } from "../../../generate/generate_random_community_hub_comments_reply";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test successful reply creation to an existing top-level comment.
 *
 * Validates the complete comment reply flow including member authentication,
 * community creation, subscription, post creation, and parent comment setup.
 * Verifies that a reply to a top-level comment correctly computes depth as
 * parent.depth + 1 (resulting in depth 1), initializes vote_score to 0,
 * preserves the exact content from the request body, and links to the correct
 * author, post, and parent comment.
 *
 * 1. Member joins and authenticates.
 * 2. Member creates a community.
 * 3. Member subscribes to the community.
 * 4. Member creates a text post in the community.
 * 5. Member creates a top-level comment on the post as parent.
 * 6. Member replies to the parent comment.
 * 7. Validates reply depth, vote score, content, author, post reference,
 *    parent summary, timestamps, and soft-deletion status.
 */
export async function test_api_comment_reply_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to community
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberConnection,
    { communityName: community.name },
  );
  // 4. Create text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  // 5. Create top-level comment as parent
  const parentComment =
    await generate_random_community_hub_posts_comments_create(
      memberConnection,
      { params: { postId: post.id } },
    );
  // 6. Reply to the top-level comment
  const replyContent = RandomGenerator.paragraph({ sentences: 3 });
  const reply = await generate_random_community_hub_comments_reply(
    memberConnection,
    {
      body: { content: replyContent },
      params: { commentId: parentComment.id },
    },
  );
  // 7. Validate reply response
  typia.assert(reply);
  TestValidator.equals("depth is 1", reply.depth, 1);
  TestValidator.equals("vote score initialized to 0", reply.vote_score, 0);
  TestValidator.equals(
    "content matches request body",
    reply.content,
    replyContent,
  );
  TestValidator.equals(
    "author matches authenticated member",
    reply.author.id,
    member.id,
  );
  TestValidator.equals(
    "post reference matches parent post",
    reply.post.id,
    post.id,
  );
  TestValidator.predicate("parent summary is present", reply.parent !== null);
  if (reply.parent !== null) {
    TestValidator.equals(
      "parent id matches",
      reply.parent.id,
      parentComment.id,
    );
    TestValidator.equals("parent depth is 0", reply.parent.depth, 0);
  }
  TestValidator.equals("deleted_at is null", reply.deleted_at, null);
  TestValidator.predicate(
    "created_at <= updated_at",
    new Date(reply.created_at).getTime() <=
      new Date(reply.updated_at).getTime(),
  );
}
