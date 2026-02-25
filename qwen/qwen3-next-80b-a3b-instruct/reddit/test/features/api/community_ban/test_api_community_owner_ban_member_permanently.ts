import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
import { generate_random_reddit_community_community_owner_communities_bans_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_bans_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";

export async function test_api_community_owner_ban_member_permanently(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community owner account
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerJoined = await authorize_community_owner_join(
    ownerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: ownerPassword,
        displayName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(ownerJoined);
  // 2. Create a new member account to be banned
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoined = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberJoined);
  // 3. Authenticate the community owner with their credentials
  const authOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(authOwnerConnection, {
    body: {
      email: ownerJoined.email,
      password: ownerPassword,
    },
  });
  // 4. Since there is no endpoint to create a community, generate a valid UUID for communityId
  // We test the ban endpoint assuming a community exists (as per system constraints)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Ban the member from the community using the provided utility function
  // The utility function wraps the bans.create endpoint, which is available
  const ban =
    await generate_random_reddit_community_community_owner_communities_bans_create(
      authOwnerConnection,
      {
        body: {
          user_id: memberJoined.id,
          reason: "Violation of community guidelines",
        },
        params: {
          communityId,
        },
      },
    );
  typia.assert(ban);
  // 6. Validate ban object
  TestValidator.equals("ban is_active is true", ban.is_active, true);
  TestValidator.equals("ban expires_at is null", ban.expires_at, null);
  TestValidator.equals(
    "ban reason matches",
    ban.reason,
    "Violation of community guidelines",
  );
  TestValidator.equals("ban user id matches", ban.user.id, memberJoined.id);
  TestValidator.equals(
    "ban user username matches",
    ban.user.username,
    memberJoined.username,
  );
  TestValidator.equals(
    "ban community id matches",
    ban.community.id,
    communityId,
  );
  TestValidator.predicate("ban created_at is ISO date-time", () => {
    const isoDate = new Date(ban.created_at);
    return (
      !isNaN(isoDate.getTime()) && ban.created_at === isoDate.toISOString()
    );
  });
}
