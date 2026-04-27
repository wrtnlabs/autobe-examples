import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_community_appointed_moderators_search_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member-A (owner) joins and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: { username: RandomGenerator.alphabets(8) },
  });
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: `test_${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(community);
  // Step 2: Member-B joins as 'zack_mod', then Member-A appoints as moderator
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: { username: "zack_mod" },
  });
  typia.assert(memberB);
  const moderatorB =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: "zack_mod",
        },
      },
    );
  typia.assert(moderatorB);
  // Step 3: Member-C joins as 'alice_mod', then Member-A appoints as moderator
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: { username: "alice_mod" },
  });
  typia.assert(memberC);
  const moderatorC =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: "alice_mod",
        },
      },
    );
  typia.assert(moderatorC);
  // Step 4: Search 'alice' with sort='member', default page=1
  const searchByMember =
    await api.functional.communityPlatform.communities.appointed_moderators.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          search: "alice",
          sort: "member",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchByMember);
  TestValidator.equals(
    "search alice by member - count",
    searchByMember.data.length,
    1,
  );
  TestValidator.predicate(
    "search alice - username includes alice",
    searchByMember.data[0].member.username.toLowerCase().includes("alice"),
  );
  // Step 5: Search 'alice' with sort='created_at'
  const searchByCreatedAt =
    await api.functional.communityPlatform.communities.appointed_moderators.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          search: "alice",
          sort: "created_at",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchByCreatedAt);
  TestValidator.equals(
    "search alice by created_at - count",
    searchByCreatedAt.data.length,
    1,
  );
  TestValidator.predicate(
    "search alice created_at - username includes alice",
    searchByCreatedAt.data[0].member.username.toLowerCase().includes("alice"),
  );
  // Step 6: sort='created_at', limit=1, page=1
  const page1 =
    await api.functional.communityPlatform.communities.appointed_moderators.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          sort: "created_at",
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1 data length", page1.data.length, 1);
  TestValidator.equals("page1 pagination records", page1.pagination.records, 2);
  TestValidator.equals("page1 pagination pages", page1.pagination.pages, 2);
  TestValidator.equals("page1 pagination current", page1.pagination.current, 1);
  TestValidator.equals("page1 pagination limit", page1.pagination.limit, 1);
  // Step 7: page=2, limit=1
  const page2 =
    await api.functional.communityPlatform.communities.appointed_moderators.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          sort: "created_at",
          limit: 1,
          page: 2,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2 data length", page2.data.length, 1);
  TestValidator.equals("page2 pagination current", page2.pagination.current, 2);
  TestValidator.equals("page2 pagination records", page2.pagination.records, 2);
  TestValidator.equals("page2 pagination pages", page2.pagination.pages, 2);
  // Step 8: sort='member', limit=10, page=1 - both moderators sorted alphabetically
  const allModerators =
    await api.functional.communityPlatform.communities.appointed_moderators.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          sort: "member",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(allModerators);
  TestValidator.equals("all moderators count", allModerators.data.length, 2);
  TestValidator.equals(
    "first moderator username",
    allModerators.data[0].member.username,
    "alice_mod",
  );
  TestValidator.equals(
    "second moderator username",
    allModerators.data[1].member.username,
    "zack_mod",
  );
}
