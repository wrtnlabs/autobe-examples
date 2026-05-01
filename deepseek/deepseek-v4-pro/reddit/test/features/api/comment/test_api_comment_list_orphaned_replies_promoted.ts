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
 * Test that orphaned child replies are promoted to top-level when the parent comment is deleted.
 *
 * Validates the comment orphan promotion rule where surviving child replies of soft-deleted
 * parent comments appear directly under the post as top-level comments in the conversation tree.
 * This ensures that discussion threads are preserved even when intermediate comments are removed.
 *
 * 1. A member registers, creates a community, subscribes, and creates a post.
 * 2. A top-level parent comment is created on the post.
 * 3. A child reply is created under the parent comment.
 * 4. The parent comment is deleted, orphaning the child reply.
 * 5. Comments are listed and validated: the deleted parent is excluded, the orphaned reply
 *    is promoted to top-level with its content preserved, and no unexpected comments appear.
 */
export async function test_api_comment_list_orphaned_replies_promoted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create parent comment
  const parentComment =
    await generate_random_community_hub_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(parentComment);
  // 6. Create child reply
  const childReply = await generate_random_community_hub_comments_reply(
    memberConnection,
    {
      params: { commentId: parentComment.id },
    },
  );
  typia.assert(childReply);
  // 7. Delete parent comment, orphaning the child reply
  await api.functional.communityHub.comments.erase(memberConnection, {
    commentId: parentComment.id,
  });
  // 8. List comments — orphaned reply should be promoted to top-level
  const comments = await api.functional.communityHub.posts.comments.list(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(comments);
  // 9. Validate orphan promotion
  TestValidator.equals(
    "orphaned reply promoted to top-level",
    comments.id,
    childReply.id,
  );
  TestValidator.equals(
    "orphaned reply content preserved",
    comments.content,
    childReply.content,
  );
  TestValidator.predicate(
    "orphaned reply has no children",
    comments.childComments.length === 0,
  );
}
