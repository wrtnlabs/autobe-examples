import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_ban } from "../../../generate/generate_random_community_member_communities_bans_ban";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_banned_user } from "../../../prepare/prepare_random_community_banned_user";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

export async function test_api_community_moderator_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user to ban
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create a new community for testing
  const community = await generate_random_community_member_communities_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  // 3. Add current user as moderator to community
  await generate_random_community_member_communities_moderators_create(
    connection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
        community_id: community.id,
        is_owner: false,
      } satisfies ICommunityModerator.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  // 4. Ban the user we just created
  await generate_random_community_member_communities_bans_ban(connection, {
    body: {
      user_id: bannedUser.id,
      reason: "Test ban for unban test",
    } satisfies ICommunityBannedUser.ICreate,
    params: {
      communityId: community.id,
    },
  });
  // 5. Unban the user
  await api.functional.community.member.communities.bans.erase(connection, {
    communityId: community.id,
    userId: bannedUser.id,
  });
}
