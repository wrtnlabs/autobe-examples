import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_admin_communities_bans_create } from "../../../generate/generate_random_reddit_like_admin_communities_bans_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_ban } from "../../../prepare/prepare_random_reddit_like_ban";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_admin_ban_user_from_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.pick([
        "https://example.com/admin.jpg",
        null,
      ]) as any,
    },
  });
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.pick([
        "https://example.com/member.jpg",
        null,
      ]) as any,
    },
  });
  // 3. Create community for testing
  const community = await generate_random_reddit_like_member_communities_create(
    adminConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
        icon_url: null as any,
      },
    },
  );
  // 4. Admin bans the member from the community
  const ban = await generate_random_reddit_like_admin_communities_bans_create(
    adminConnection,
    {
      body: {
        reddit_like_user_id: member.id,
        reddit_like_community_id: community.id,
        status: "active",
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals(
    "ban user ID matches",
    ban.reddit_like_user_id,
    member.id,
  );
  TestValidator.equals(
    "ban community ID matches",
    ban.reddit_like_community_id,
    community.id,
  );
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals("banned user matches", ban.bannedUser.id, member.id);
  TestValidator.equals(
    "banned community matches",
    ban.bannedCommunity.name,
    community.name,
  );
  TestValidator.predicate(
    "has created_at",
    ban.created_at !== null && ban.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    ban.updated_at !== null && ban.updated_at !== undefined,
  );
  TestValidator.predicate("has deleted_at", ban.deleted_at !== null);
}