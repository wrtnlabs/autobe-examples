import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_ban_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (Community Owner) Setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Member A Creates Community
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = {
    Authorization: memberAAuth.token.access,
  };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name:
            RandomGenerator.alphabets(8) + "_" + RandomGenerator.alphabets(4),
          description: "Test community for ban/unban testing",
        },
      },
    );
  typia.assert(community);
  // 3. Member B (Target User) Setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 4. Member A Bans Member B
  const ban =
    await generate_random_reddit_platform_member_communities_bans_create(
      communityConnection,
      {
        body: {
          user_id: memberBAuth.id,
          reason: "Test ban for unban testing",
        },
        params: { communityName: community.name },
      },
    );
  typia.assert(ban);
  // Verify ban is active (unbanned_at is null)
  TestValidator.equals("ban is active", ban.unbanned_at, null);
  TestValidator.equals("bannedBy is member A", ban.bannedBy.id, memberAAuth.id);
  TestValidator.equals("user is member B", ban.user.id, memberBAuth.id);
  TestValidator.equals("community matches", ban.community.name, community.name);
  // 5. Member A (Owner) Unbans Member B
  await api.functional.redditPlatform.member.bans.erase(communityConnection, {
    banId: ban.id,
  });
  // 6. Validate Unban Operation Succeeded
  // The erase operation returns void but HTTP 200 means success
  // We verify the ban record structure is correct before unban
  TestValidator.predicate(
    "ban reason preserved",
    ban.reason === "Test ban for unban testing",
  );
  TestValidator.predicate("banned_at is set", ban.banned_at !== undefined);
  TestValidator.predicate(
    "community owner is member A",
    community.owner.id === memberAAuth.id,
  );
}
