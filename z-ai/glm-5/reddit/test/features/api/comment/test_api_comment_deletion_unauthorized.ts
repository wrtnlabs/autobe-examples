import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test that a member cannot delete another member's comment.
 *
 * This test verifies authorization boundaries by:
 * 1. Member A creates a community, subscribes to it, creates a post, and adds a comment
 * 2. Member B attempts to delete Member A's comment
 * 3. Verify the deletion fails with HTTP 403 Forbidden
 */
export async function test_api_comment_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Create community as Member A
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Subscribe Member A to the community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Create post as Member A
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // Create comment as Member A
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    {
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(comment);
  // Member B setup (separate connection)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Member B attempts to delete Member A's comment - should fail with 403
  await TestValidator.httpError(
    "Member B cannot delete Member A's comment",
    403,
    async () => {
      await api.functional.community.member.comments.erase(memberBConnection, {
        commentId: comment.id,
      });
    },
  );
}
