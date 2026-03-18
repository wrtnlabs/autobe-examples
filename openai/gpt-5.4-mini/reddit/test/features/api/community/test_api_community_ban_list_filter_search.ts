import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_list_filter_search(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: `P@ssw0rd!${RandomGenerator.alphaNumeric(6)}`,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/community/${RandomGenerator.alphaNumeric(8)}.png`,
        },
      },
    );
  typia.assert(community);
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: `target_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: `P@ssw0rd!${RandomGenerator.alphaNumeric(6)}`,
      username: `target_${RandomGenerator.alphaNumeric(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(targetMember);
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMember = await authorize_member_join(anotherMemberConnection, {
    body: {
      email: `another_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: `P@ssw0rd!${RandomGenerator.alphaNumeric(6)}`,
      username: `another_${RandomGenerator.alphaNumeric(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(anotherMember);
  const now = new Date();
  const activeBanReason = `keyword-active-${RandomGenerator.alphaNumeric(6)}`;
  const inactiveBanReason = `keyword-inactive-${RandomGenerator.alphaNumeric(6)}`;
  const otherBanReason = `other-${RandomGenerator.alphaNumeric(6)}`;
  const activeBan =
    await generate_random_community_platform_member_communities_bans_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: targetMember.id,
          reason: activeBanReason,
          startedAt: now.toISOString(),
          endedAt: null,
        },
      },
    );
  typia.assert(activeBan);
  const inactiveBan =
    await generate_random_community_platform_member_communities_bans_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: anotherMember.id,
          reason: inactiveBanReason,
          startedAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
          endedAt: new Date(now.getTime() - 1000 * 60).toISOString(),
        },
      },
    );
  typia.assert(inactiveBan);
  const otherBan =
    await generate_random_community_platform_member_communities_bans_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: member.id,
          reason: otherBanReason,
          startedAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
          endedAt: null,
        },
      },
    );
  typia.assert(otherBan);
  const unfilteredPage =
    await api.functional.communityPlatform.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(unfilteredPage);
  TestValidator.predicate(
    "unfiltered results stay in the same community",
    unfilteredPage.data.every((ban) => ban.community.id === community.id),
  );
  TestValidator.predicate(
    "unfiltered results include all created bans",
    unfilteredPage.data.some((ban) => ban.id === activeBan.id) &&
      unfilteredPage.data.some((ban) => ban.id === inactiveBan.id) &&
      unfilteredPage.data.some((ban) => ban.id === otherBan.id),
  );
  TestValidator.equals(
    "unfiltered pagination records",
    unfilteredPage.pagination.records,
    unfilteredPage.data.length,
  );
  const activePage =
    await api.functional.communityPlatform.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          isActive: true,
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(activePage);
  TestValidator.predicate(
    "active filter excludes inactive bans",
    !activePage.data.some((ban) => ban.id === inactiveBan.id),
  );
  TestValidator.predicate(
    "active filter excludes other inactive bans",
    !activePage.data.some((ban) => ban.id === otherBan.id) ||
      otherBan.endedAt === null,
  );
  TestValidator.predicate(
    "active filter keeps only active bans",
    activePage.data.every(
      (ban) => ban.ended_at === null && ban.deleted_at === null,
    ),
  );
  TestValidator.predicate(
    "active filter reduces or keeps result set size",
    activePage.pagination.records <= unfilteredPage.pagination.records,
  );
  TestValidator.predicate(
    "active filter does not increase page count",
    activePage.pagination.pages <= unfilteredPage.pagination.pages,
  );
  TestValidator.predicate(
    "active filter returns the active ban",
    activePage.data.some((ban) => ban.id === activeBan.id),
  );
  const searchByMemberPage =
    await api.functional.communityPlatform.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          search: targetMember.displayName,
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(searchByMemberPage);
  TestValidator.predicate(
    "search by member display name finds the matching ban",
    searchByMemberPage.data.some((ban) => ban.id === activeBan.id),
  );
  TestValidator.predicate(
    "search by member display name stays in community",
    searchByMemberPage.data.every((ban) => ban.community.id === community.id),
  );
  TestValidator.predicate(
    "search by member display name narrows the result set",
    searchByMemberPage.pagination.records <= unfilteredPage.pagination.records,
  );
  const searchByReasonPage =
    await api.functional.communityPlatform.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          search: inactiveBanReason,
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(searchByReasonPage);
  TestValidator.predicate(
    "search by reason finds the inactive ban",
    searchByReasonPage.data.some((ban) => ban.id === inactiveBan.id),
  );
  TestValidator.equals(
    "search by reason record count",
    searchByReasonPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "search by reason page count",
    searchByReasonPage.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "search by reason stays in the same community",
    searchByReasonPage.data.every((ban) => ban.community.id === community.id),
  );
  const paged =
    await api.functional.communityPlatform.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "new",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination limit", paged.pagination.limit, 1);
  TestValidator.equals("pagination current", paged.pagination.current, 1);
  TestValidator.predicate(
    "pagination result is scoped to community",
    paged.data.every((ban) => ban.community.id === community.id),
  );
  TestValidator.predicate(
    "pagination contains at most one item",
    paged.data.length <= 1,
  );
  TestValidator.predicate(
    "pagination metadata reflects a smaller page size",
    paged.pagination.records === unfilteredPage.pagination.records,
  );
}
