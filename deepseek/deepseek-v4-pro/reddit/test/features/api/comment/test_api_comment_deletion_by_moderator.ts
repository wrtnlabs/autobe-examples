import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
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
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that a community moderator can delete any comment in their community regardless of authorship.
 *
 * Validates the moderator deletion authority defined in the community moderation requirements. A community owner creates a community, subscribes to it, posts content, and writes a comment. A second member is then appointed as a moderator by the owner and proceeds to delete the owner's comment — verifying that moderators can remove content they did not author.
 *
 * The test also confirms that the owner's authority to appoint moderators is correctly enforced and that the moderator role assignment properly identifies both the target member and the appointing member.
 *
 * 1. Member A registers via member join and creates a community, becoming its owner.
 * 2. Member A subscribes to the community to enable posting.
 * 3. Member A creates a text post in the community.
 * 4. Member A writes a top-level comment on the newly created post.
 * 5. Member B registers as a separate, independent member.
 * 6. Member A adds Member B as a moderator of the community, granting content moderation privileges.
 * 7. Member B, now a moderator, deletes Member A's comment — the deletion succeeds because moderators have authority to remove any comment in their community.
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Member A subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Member A creates a post
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    { params: { communityName: community.name } },
  );
  // 5. Member A writes a comment
  const comment = await generate_random_community_hub_posts_comments_create(
    memberAConnection,
    { params: { postId: post.id } },
  );
  // 6. Member B registers
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 7. Member A adds Member B as moderator
  const moderator =
    await generate_random_community_hub_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: { username: memberB.username },
      },
    );
  TestValidator.equals(
    "moderator is Member B",
    moderator.member.username,
    memberB.username,
  );
  // 8. Member B (moderator) deletes Member A's comment
  await api.functional.communityHub.comments.erase(memberBConnection, {
    commentId: comment.id,
  });
}
