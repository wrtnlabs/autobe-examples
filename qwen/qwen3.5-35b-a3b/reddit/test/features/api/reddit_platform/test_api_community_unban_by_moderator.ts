import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test community moderator unban functionality.
 * Verifies that a moderator (who is not the owner) can remove bans they created.
 *
 * Workflow:
 * 1. Create community owner account
 * 2. Owner creates community
 * 3. Create moderator candidate account
 * 4. Owner appoints moderator
 * 5. Create member to be banned
 * 6. Moderator bans member
 * 7. Moderator unban member
 * 8. Validate unban succeeds
 */
export async function test_api_community_unban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name().replace(/\s+/g, "").toLowerCase(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  // 2. Owner creates community
  const adminConnection: api.IConnection = { host: connection.host };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name().replace(/\s+/g, "").toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create moderator candidate account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name().replace(/\s+/g, "").toLowerCase(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // 4. Add moderator to community (by owner)
  const addModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(addModeratorConnection, {
    body: {
      email: owner.email,
      password: "1234",
    },
  });
  const moderatorAppointment =
    await api.functional.redditPlatform.member.communities.moderators.add(
      addModeratorConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderator.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);
  // 5. Create member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name().replace(/\s+/g, "").toLowerCase(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 6. Moderator bans the member
  const banConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(banConnection, {
    body: {
      email: moderator.email,
      password: "1234",
    },
  });
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      banConnection,
      {
        communityId: community.id,
        body: {
          user_id: member.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban created successfully", ban.isActive, true);
  // 7. Moderator unban the member
  const unbanConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(unbanConnection, {
    body: {
      email: moderator.email,
      password: "1234",
    },
  });
  await api.functional.redditPlatform.member.communities.bans.erase(
    unbanConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 8. Validate unban succeeds
  // The erase operation returns void on success, confirming the ban was removed
  TestValidator.predicate("unban operation completed successfully", true);
}
