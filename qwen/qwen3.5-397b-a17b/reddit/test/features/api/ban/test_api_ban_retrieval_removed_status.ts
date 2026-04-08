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
 * Test retrieval of a ban record with 'removed' status to verify ban lifecycle tracking.
 *
 * Validates the complete ban lifecycle flow including community owner authentication, community creation, member registration, ban creation with removed status, and ban retrieval. Ensures that the ban record correctly tracks the 'removed' status indicating the member has regained posting privileges.
 *
 * Special attention is given to verifying that the ban status field accurately reflects 'removed' state, and that all associated metadata (reason, member reference, issuer reference, timestamps) are correctly populated and accessible through the retrieval endpoint.
 *
 * 1. Member A registers and authenticates as community owner.
 * 2. Member A creates a community they will own.
 * 3. Member B registers as the member to be banned.
 * 4. Member A creates a ban on Member B with status='removed'.
 * 5. Member A retrieves the ban record by ID.
 * 6. Validates ban contains status='removed' and all required fields are present.
 */
export async function test_api_ban_retrieval_removed_status(
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
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4. Member A creates a ban on member B with status='removed'
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_community_member_id: memberBAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "removed",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Member A retrieves the ban details
  const retrievedBan =
    await api.functional.redditCommunity.member.communities.bans.at(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 6. Validate ban record
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("ban status is removed", retrievedBan.status, "removed");
  TestValidator.equals(
    "banned member id matches",
    retrievedBan.member.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals("issuer is owner", retrievedBan.issuer.id, ownerAuth.id);
  TestValidator.predicate("reason is present", retrievedBan.reason.length > 0);
  TestValidator.predicate(
    "created_at is valid",
    retrievedBan.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedBan.updated_at.length > 0,
  );
}
