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
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that a soft-deleted comment cannot be edited by its original author.
 *
 * Verifies the backend rejects PATCH requests targeting comments with a
 * non-null deleted_at timestamp. The original author creates and then
 * deletes their own comment. The same author then attempts to edit the
 * deleted comment and expects an HTTP 403 Forbidden response — deleted
 * comments are immutable regardless of authorship.
 *
 * 1. Register a new member and authenticate via authorize_member_join.
 * 2. Create a community owned by the member.
 * 3. Subscribe the member to the newly created community.
 * 4. Create a text post within the community.
 * 5. Create a top-level comment on the post.
 * 6. Delete the comment (soft-delete, sets deleted_at).
 * 7. Attempt to edit the deleted comment, expecting 403 Forbidden.
 */
export async function test_api_comment_edit_deleted_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Delete the comment (soft-delete)
  await api.functional.communityHub.comments.erase(memberConnection, {
    commentId: comment.id,
  });
  // 7. Attempt to edit the deleted comment — expect 403 Forbidden
  await TestValidator.httpError(
    "editing a deleted comment returns 403",
    403,
    async () => {
      await api.functional.communityHub.comments.update(memberConnection, {
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityHubComment.IUpdate,
      });
    },
  );
}
