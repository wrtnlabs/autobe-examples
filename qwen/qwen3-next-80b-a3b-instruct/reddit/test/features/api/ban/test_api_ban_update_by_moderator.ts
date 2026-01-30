import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_user_ban } from "../../../prepare/prepare_random_community_bbs_user_ban";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { generate_random_community_bbs_moderator_users_bans_create } from "../../../generate/generate_random_community_bbs_moderator_users_bans_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_ban_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    },
  });
  typia.assert(moderatorAuth);
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberAuth);
  // Step 3: Member creates a community
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 4: Member creates a post in the community
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(4),
        community_id: community.id,
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // Step 5: Moderator creates an initial ban on the member
  const initialBan =
    await generate_random_community_bbs_moderator_users_bans_create(
      moderatorConnection,
      {
        body: {
          userId: memberAuth.id,
          reason: "Initial violation of community guidelines",
        },
      },
    );
  // Step 6: Moderator updates the ban with new expiration date and reason
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000); // 24 hours from now
  const updatedBan =
    await api.functional.communityBbs.moderator.users.bans.update(
      moderatorConnection,
      {
        body: {
          expiresAt: tomorrow.toISOString(), // 24 hours from now
          reason: "Updated violation reason: multiple severe violations",
        },
      },
    );
  typia.assert(updatedBan);
  // Step 7: Verify the updated ban has the correct expiration date and reason
  TestValidator.equals(
    "updated ban reason is correct",
    updatedBan.reason,
    "Updated violation reason: multiple severe violations",
  );
  // Verify expiration date is in the future and in correct format
  TestValidator.predicate(
    "updated ban expiration date is in the future",
    () => {
      const expiresAt = new Date(updatedBan.expires_at ?? 'invalid-date');
      return expiresAt > now;
    },
  );
  // Verify date format is ISO 8601
  TestValidator.predicate(
    "updated ban expiration date is in ISO 8601 format",
    () => {
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
        updatedBan.expires_at ?? '',
      );
    },
  );
}