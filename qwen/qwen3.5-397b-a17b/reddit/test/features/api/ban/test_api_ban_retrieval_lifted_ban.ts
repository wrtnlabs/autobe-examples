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

export async function test_api_ban_retrieval_lifted_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "BannedPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Issue ban against the member
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      body: {
        member_id: bannedMemberAuth.id,
        reason: banReason,
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // Verify initial ban is active (deleted_at is null)
  TestValidator.equals("initial ban is active", ban.deleted_at, null);
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.equals(
    "banned member id matches",
    ban.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals("issuer is owner", ban.issuer.id, ownerAuth.id);
  // 5. Lift the ban by updating deleted_at to current timestamp
  const liftedBan =
    await api.functional.redditClone.member.communities.bans.update(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies IRedditCloneBan.IUpdate,
      },
    );
  typia.assert(liftedBan);
  // Verify ban has been lifted
  TestValidator.predicate(
    "ban is lifted (deleted_at is set)",
    liftedBan.deleted_at !== null,
  );
  // 6. Retrieve the ban details using GET endpoint
  const retrievedBan =
    await api.functional.redditClone.member.communities.bans.at(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // Validate retrieved ban has deleted_at set (ban is lifted)
  TestValidator.predicate(
    "retrieved ban has deleted_at timestamp",
    retrievedBan.deleted_at !== null,
  );
  TestValidator.equals(
    "retrieved ban reason matches original",
    retrievedBan.reason,
    banReason,
  );
  TestValidator.equals(
    "retrieved banned member id matches",
    retrievedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "retrieved issuer is owner",
    retrievedBan.issuer.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "retrieved community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals("ban id preserved after lift", retrievedBan.id, ban.id);
}
