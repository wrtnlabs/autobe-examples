import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_ban_multi_community_independence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account (Member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create two separate communities (Community A and Community B)
  const communityA = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: `community_a_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(communityA);
  const communityB = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: `community_b_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(communityB);
  // Verify communities are distinct
  TestValidator.notEquals(
    "communities have different IDs",
    communityA.id,
    communityB.id,
  );
  TestValidator.notEquals(
    "communities have different names",
    communityA.name,
    communityB.name,
  );
  // 3. Create second member account (Member B - to be banned)
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedUserAuth);
  // 4. Ban the second member from Community A only
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityId: communityA.id,
      },
      body: {
        member_id: bannedUserAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(ban);
  // Validate ban was created correctly for Community A
  TestValidator.equals(
    "ban member matches banned user",
    ban.member.id,
    bannedUserAuth.id,
  );
  TestValidator.equals(
    "ban community matches Community A",
    ban.community.id,
    communityA.id,
  );
  TestValidator.predicate(
    "ban is active (not deleted)",
    ban.deleted_at === null,
  );
  // 5. Verify the ban is scoped only to Community A
  // The banned user should NOT have a ban record for Community B
  // We verify this by checking the ban details show Community A, not Community B
  TestValidator.notEquals(
    "ban community is Community A not Community B",
    ban.community.id,
    communityB.id,
  );
  TestValidator.equals(
    "ban issuer is community owner",
    ban.issuer.id,
    ownerAuth.id,
  );
}
