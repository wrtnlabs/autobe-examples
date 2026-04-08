import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a community owner can successfully retrieve detailed ban information for a ban they issued.
 *
 * Validates the complete ban retrieval workflow including community owner authentication, community creation, member registration, ban creation, and ban detail retrieval. Ensures that the ban record contains all required fields and that the issuer correctly identifies the community owner who created the ban.
 *
 * Special attention is given to verifying that the ban status is 'active', the reason is preserved, and all summary objects (community, member, issuer) contain accurate information matching the test setup.
 *
 * 1. Register member A as community owner using authorize_member_join utility.
 * 2. Create a community owned by member A using generate_random_reddit_community_member_communities_create utility.
 * 3. Register member B as the user to be banned using authorize_member_join utility.
 * 4. Member A creates a ban on member B with status 'active' and a reason using generate_random_reddit_community_member_communities_bans_create utility.
 * 5. Member A retrieves the ban details using the ban ID via SDK function.
 * 6. Validate response contains complete ban record with all required fields and correct issuer identification.
 */
export async function test_api_ban_retrieval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community owned by member A
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Register member B (user to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Member A creates a ban on member B with status 'active'
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Member A retrieves the ban details using the ban ID
  const retrievedBan =
    await api.functional.redditCommunity.member.communities.bans.at(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 6. Validate the retrieved ban contains all required fields
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("ban reason matches", retrievedBan.reason, ban.reason);
  TestValidator.equals("ban status is active", retrievedBan.status, "active");
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member id matches",
    retrievedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.member.username,
    bannedMemberAuth.username,
  );
  TestValidator.equals(
    "issuer id matches owner",
    retrievedBan.issuer.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "issuer username matches owner",
    retrievedBan.issuer.username,
    ownerAuth.username,
  );
}
