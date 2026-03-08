import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_member_bans_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: "test_owner@example.com",
      username: RandomGenerator.name().replace(/\s+/g, "_").toLowerCase(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B (non-moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: "test_nonmod@example.com",
      username: RandomGenerator.name().replace(/\s+/g, "_").toLowerCase(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create Member C (banned user)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: "test_banned@example.com",
      username: RandomGenerator.name().replace(/\s+/g, "_").toLowerCase(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberC);
  // 4. Create community as Member A (owner)
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityConnection, {
    body: {
      email: memberA.email,
      username: memberA.username,
      password: memberA.token.refresh,
    },
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.name().replace(/\s+/g, "_").toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Create a ban record using Member A's owner privileges
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      communityConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberC.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 6. Test non-moderator access to bans (should return 403)
  const testNonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(testNonModeratorConnection, {
    body: {
      email: memberB.email,
      username: memberB.username,
      password: memberB.token.refresh,
    },
  });
  await TestValidator.httpError(
    "non-moderator cannot access bans (403 Forbidden)",
    403,
    async () => {
      await api.functional.redditPlatform.member.bans.index(
        testNonModeratorConnection,
        {
          body: {
            communityName: community.name,
          } satisfies IRedditPlatformCommunityBan.IRequest,
        },
      );
    },
  );
  // 7. Test owner access to bans (should succeed)
  const ownerAccessConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerAccessConnection, {
    body: {
      email: memberA.email,
      username: memberA.username,
      password: memberA.token.refresh,
    },
  });
  const bansAsOwner = await api.functional.redditPlatform.member.bans.index(
    ownerAccessConnection,
    {
      body: {
        communityName: community.name,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(bansAsOwner);
  TestValidator.equals("owner can access bans", bansAsOwner.data.length, 1);
  TestValidator.equals(
    "ban record contains correct user",
    bansAsOwner.data[0].user.id,
    memberC.id,
  );
  // 8. Test with non-existent community (should return 404)
  const testNonExistentCommunityConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_join(testNonExistentCommunityConnection, {
    body: {
      email: memberA.email,
      username: memberA.username,
      password: memberA.token.refresh,
    },
  });
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.member.bans.index(
        testNonExistentCommunityConnection,
        {
          body: {
            communityName: "non_existent_community_12345",
          } satisfies IRedditPlatformCommunityBan.IRequest,
        },
      );
    },
  );
  // 9. Test with different community (non-moderator)
  const testDifferentCommunityConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_join(testDifferentCommunityConnection, {
    body: {
      email: memberB.email,
      username: memberB.username,
      password: memberB.token.refresh,
    },
  });
  const otherCommunity =
    await api.functional.redditPlatform.member.communities.create(
      ownerAccessConnection,
      {
        body: {
          name:
            RandomGenerator.name().replace(/\s+/g, "_").toLowerCase() + "_2",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  await TestValidator.httpError(
    "non-moderator cannot access other community bans (403 Forbidden)",
    403,
    async () => {
      await api.functional.redditPlatform.member.bans.index(
        testDifferentCommunityConnection,
        {
          body: {
            communityName: otherCommunity.name,
          } satisfies IRedditPlatformCommunityBan.IRequest,
        },
      );
    },
  );
}
