import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_community_ban_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(ownerAuth);
  // 2. Owner creates community
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create member who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(bannedMemberConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(bannedMemberAuth);
  // 4. Owner creates ban record for the member
  const ban: IRedditPlatformCommunityBan =
    await generate_random_reddit_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_platform_member_id: bannedMemberAuth.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Owner retrieves the ban record
  const retrievedBan: IRedditPlatformCommunityBan =
    await api.functional.redditPlatform.member.communities.bans.at(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 6. Validate ban record contents
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "banned by matches owner",
    retrievedBan.bannedBy.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "has created timestamp",
    retrievedBan.created_at !== null,
  );
  TestValidator.predicate(
    "has updated timestamp",
    retrievedBan.updated_at !== null,
  );
}