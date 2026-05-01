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
 * Test that replying to a soft-deleted parent comment is rejected with a 400 error.
 *
 * Validates the race-condition guard in the comment reply endpoint that prevents
 * creating a reply under a parent comment that has been soft-deleted between page
 * load and reply submission. The specification requires a SELECT FOR UPDATE locking
 * strategy to ensure transactional safety between the parent existence check and the
 * reply insert — this test exercises that exact failure path.
 *
 * 1. A member registers and authenticates on the platform.
 * 2. The member creates a community and subscribes to it.
 * 3. The member creates a post within the subscribed community.
 * 4. A top-level parent comment is created on the post.
 * 5. The parent comment is soft-deleted via the delete endpoint.
 * 6. An attempt to reply to the now-deleted parent comment is rejected with HTTP 400.
 */
export async function test_api_comment_reply_deleted_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
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
  // 4. Create post in community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  // 5. Create top-level parent comment on the post
  const parentComment =
    await generate_random_community_hub_posts_comments_create(
      memberConnection,
      { params: { postId: post.id } },
    );
  typia.assert(parentComment);
  // 6. Soft-delete the parent comment
  await api.functional.communityHub.comments.erase(memberConnection, {
    commentId: parentComment.id,
  });
  // 7. Attempt to reply to the deleted parent comment → expect 400
  await TestValidator.httpError(
    "reply to deleted parent comment",
    400,
    async () => {
      await api.functional.communityHub.comments.reply(memberConnection, {
        commentId: parentComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityHubComment.ICreate,
      });
    },
  );
}
