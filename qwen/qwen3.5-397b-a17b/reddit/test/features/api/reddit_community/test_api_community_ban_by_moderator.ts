import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test that a community moderator (not owner) can ban users from their community.
 *
 * Test Steps:
 * 1. Create owner account and authenticate
 * 2. Create community with unique name (owner becomes creator)
 * 3. Create moderator account and authenticate
 * 4. Create user account who will be banned
 * 5. Owner adds moderator to community
 * 6. Moderator bans the user from community with a reason
 * 7. Verify ban record is created with correct details including banned_by referencing the moderator (not owner)
 *
 * Business Validations:
 * - Moderator has authority to ban users in their community
 * - Ban record correctly references the moderator as banned_by
 * - Ban is scoped to the specific community only
 * - Ban takes effect immediately
 */
export async function test_api_community_ban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
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
  // 2. Create community
  const communityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name", community.name, communityName);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Create user to be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(bannedUserAuth);
  // 5. Owner adds moderator to community
  const moderatorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityName: communityName,
        },
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  TestValidator.equals(
    "moderator community",
    moderatorRecord.community.name,
    communityName,
  );
  TestValidator.equals(
    "moderator member id",
    moderatorRecord.member.id,
    moderatorAuth.id,
  );
  // 6. Moderator bans the user
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const banRecord =
    await generate_random_reddit_community_member_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityName: communityName,
        },
        body: {
          reddit_community_member_id: bannedUserAuth.id,
          reason: banReason,
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 7. Validate ban record
  TestValidator.equals(
    "ban community",
    banRecord.community.name,
    communityName,
  );
  TestValidator.equals(
    "ban community id",
    banRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned member id",
    banRecord.bannedMember.id,
    bannedUserAuth.id,
  );
  TestValidator.equals(
    "banned by moderator id",
    banRecord.bannedBy.id,
    moderatorAuth.id,
  );
  TestValidator.notEquals(
    "banned by is not owner",
    banRecord.bannedBy.id,
    ownerAuth.id,
  );
  TestValidator.equals("ban reason", banRecord.reason, banReason);
  TestValidator.predicate("ban is active", banRecord.deleted_at === null);
}
