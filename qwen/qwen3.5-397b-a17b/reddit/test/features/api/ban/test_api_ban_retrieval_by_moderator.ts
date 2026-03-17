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

export async function test_api_ban_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
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
  typia.assert(moderatorAuth);
  // 2. Create community (moderator becomes owner)
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create member account to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
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
  typia.assert(bannedMemberAuth);
  // 4. Issue ban against the member in the community
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      body: {
        member_id: bannedMemberAuth.id,
        reason: banReason,
      } satisfies IRedditCloneBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 5. Retrieve the ban details using GET endpoint
  const retrievedBan =
    await api.functional.redditClone.member.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // Validate ban details
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.member.username,
    bannedMemberAuth.username,
  );
  TestValidator.equals(
    "banned member display name matches",
    retrievedBan.member.display_name,
    bannedMemberAuth.display_name,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "issuer (moderator) ID matches",
    retrievedBan.issuer.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "issuer username matches",
    retrievedBan.issuer.username,
    moderatorAuth.username,
  );
  TestValidator.equals("ban reason matches", retrievedBan.reason, banReason);
  TestValidator.predicate(
    "ban has valid created_at",
    retrievedBan.created_at !== null,
  );
  TestValidator.predicate(
    "ban has valid updated_at",
    retrievedBan.updated_at !== null,
  );
  TestValidator.equals(
    "ban is active (deleted_at is null)",
    retrievedBan.deleted_at,
    null,
  );
}
