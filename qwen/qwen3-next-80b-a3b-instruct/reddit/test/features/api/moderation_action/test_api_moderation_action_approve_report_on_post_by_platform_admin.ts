import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_platform_admin_moderation_actions_create } from "../../../generate/generate_random_reddit_community_platform_admin_moderation_actions_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderation_action_of_post } from "../../../prepare/prepare_random_reddit_community_moderation_action_of_post";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_moderation_action_approve_report_on_post_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdminCredentials: IRedditCommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_platform_admin_join(platformAdminConnection, {
    body: platformAdminCredentials,
  });
  // 2. Authenticate as community owner and create community
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwnerCredentials: IRedditCommunityCommunityOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_community_owner_join(communityOwnerConnection, {
    body: communityOwnerCredentials,
  });
  const community: IRedditCommunityCommunity =
    await generate_random_reddit_community_community_owner_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
        },
      },
    );
  // 3. Authenticate as member and create post
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_member_join(memberConnection, { body: memberCredentials });
  const post: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          communityName: community.name,
          textContent: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(post);
  // 4. Submit moderation action to approve report on post
  // Use utility function instead of direct SDK call (priority rule)
  const moderationAction: IRedditCommunityModerationActionOfPost.ICreate = {
    target_type: "post",
    action_type: "approve",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  };
  await generate_random_reddit_community_platform_admin_moderation_actions_create(
    platformAdminConnection,
    { body: moderationAction },
  );
  // Note: The system should soft-delete the post after approval.
  // However, there is no API endpoint provided to retrieve a post by ID to verify its status.
  // Therefore, we can only validate that the moderation action was submitted successfully.
  // This test passes if no error is thrown during moderation action creation.
}
