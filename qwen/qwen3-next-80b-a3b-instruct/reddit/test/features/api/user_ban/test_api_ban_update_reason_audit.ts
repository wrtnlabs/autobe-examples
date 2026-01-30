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
export async function test_api_ban_update_reason_audit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create moderator actor
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 3: Create community for member to post in
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Member creates a post to establish existence for ban
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.alphaNumeric(20), // Required property added
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 5: Moderator creates initial ban with basic reason
  const initialBan =
    await generate_random_community_bbs_moderator_users_bans_create(
      moderatorConnection,
      {
        body: {
          userId: member.id,
          reason: "Violation of community guidelines", // Basic reason
        } satisfies ICommunityBbsUserBan.ICreate,
      },
    );
  // Step 6: Switch to moderator connection (already authenticated)
  // Step 7: Moderator updates ban with detailed, compliant reason
  const updatedBan: ICommunityBbsUserBan =
    await api.functional.communityBbs.moderator.users.bans.update(
      moderatorConnection,
      {
        body: {
          reason:
            "This user has repeatedly violated our community guidelines by posting abusive content and spamming multiple threads. After multiple warnings, no improvement was observed, leading to this permanent ban.", // Detailed compliant reason
          expiresAt: null, // Permanent ban
        } satisfies ICommunityBbsUserBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Step 8: Verify updated ban shows the new comprehensive reason
  TestValidator.equals(
    "Updated reason matches",
    updatedBan.reason,
    "This user has repeatedly violated our community guidelines by posting abusive content and spamming multiple threads. After multiple warnings, no improvement was observed, leading to this permanent ban.",
  );
}