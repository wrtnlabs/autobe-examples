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

export async function test_api_member_bans_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAccount = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAccount);
  // 2. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<255> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create target members to ban
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAccount = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(targetAccount);
  // 4. Create ban records with different users to avoid duplicate constraint
  // Ban 1: Permanent ban (expires_at is null)
  const permanentBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      communityConnection,
      {
        communityId: community.id,
        body: {
          user_id: targetAccount.id,
          expires_at: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  // Ban 2: Time-limited ban with future expires_at (different user)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondAccount = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(secondAccount);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
  const timeLimitedBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      communityConnection,
      {
        communityId: community.id,
        body: {
          user_id: secondAccount.id,
          expires_at: futureDate.toISOString(),
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(timeLimitedBan);
  // Ban 3: Create another ban then unban it to create removed status
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdAccount = await authorize_member_join(thirdMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(thirdAccount);
  const unbannedBan =
    await api.functional.redditPlatform.member.communities.bans.create(
      communityConnection,
      {
        communityId: community.id,
        body: {
          user_id: thirdAccount.id,
          expires_at: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(unbannedBan);
  // Unban the third ban to create removed status
  await api.functional.redditPlatform.member.communities.bans.erase(
    communityConnection,
    {
      communityId: community.id,
      banId: unbannedBan.id,
    },
  );
  // 5. Test status filter='active'
  const activeBansResponse =
    await api.functional.redditPlatform.member.bans.index(communityConnection, {
      body: {
        status: "active",
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(activeBansResponse);
  TestValidator.equals("active bans count", activeBansResponse.data.length, 2);
  TestValidator.predicate(
    "all active bans have isActive true",
    activeBansResponse.data.every((ban) => ban.isActive === true),
  );
  // 6. Test status filter='removed'
  const removedBansResponse =
    await api.functional.redditPlatform.member.bans.index(communityConnection, {
      body: {
        status: "removed",
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(removedBansResponse);
  TestValidator.equals(
    "removed bans count",
    removedBansResponse.data.length,
    1,
  );
  TestValidator.predicate(
    "removed ban has deleted_at set",
    removedBansResponse.data[0].deletedAt !== null,
  );
  // 7. Test pagination with limit parameter
  const paginatedResponse =
    await api.functional.redditPlatform.member.bans.index(communityConnection, {
      body: {
        limit: 2,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit applied",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pagination limit in metadata",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records correct",
    paginatedResponse.pagination.records >= paginatedResponse.data.length,
  );
  // 8. Test sorting with sortBy and sortOrder
  // Sort by created_at ascending
  const sortedAscResponse =
    await api.functional.redditPlatform.member.bans.index(communityConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(sortedAscResponse);
  // Verify ascending order
  for (let i = 1; i < sortedAscResponse.data.length; i++) {
    TestValidator.predicate(
      `asc sort order correct at index ${i}`,
      new Date(sortedAscResponse.data[i].createdAt) >=
        new Date(sortedAscResponse.data[i - 1].createdAt),
    );
  }
  // Sort by created_at descending
  const sortedDescResponse =
    await api.functional.redditPlatform.member.bans.index(communityConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(sortedDescResponse);
  // Verify descending order
  for (let i = 1; i < sortedDescResponse.data.length; i++) {
    TestValidator.predicate(
      `desc sort order correct at index ${i}`,
      new Date(sortedDescResponse.data[i].createdAt) <=
        new Date(sortedDescResponse.data[i - 1].createdAt),
    );
  }
  // 9. Test combined filters (status + pagination)
  const combinedResponse =
    await api.functional.redditPlatform.member.bans.index(communityConnection, {
      body: {
        status: "active",
        limit: 1,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filter returns correct count",
    combinedResponse.data.length,
    1,
  );
  TestValidator.predicate(
    "combined filter maintains status filter",
    combinedResponse.data.every((ban) => ban.isActive === true),
  );
}
