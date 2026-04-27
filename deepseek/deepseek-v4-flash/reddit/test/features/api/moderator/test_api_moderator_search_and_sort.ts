import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
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

export async function test_api_moderator_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create community with a distinctive name for search testing
  const distinctiveName = "SearchTest_" + RandomGenerator.alphabets(8);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: { name: distinctiveName },
      },
    );
  typia.assert(community);
  // Step 3: Join moderator candidate member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // Step 4: Appoint the second member as a moderator of the community
  const moderatorAssignment =
    await api.functional.communityPlatform.member.moderators.create(
      ownerConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: moderator.username,
        } satisfies ICommunityPlatformModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // Step 5: Search by community name — verify partial text matching
  const searchByCommunity =
    await api.functional.communityPlatform.moderators.index(ownerConnection, {
      body: {
        search: distinctiveName,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(searchByCommunity);
  TestValidator.predicate(
    "search by community name returns both owner and moderator records",
    searchByCommunity.data.length >= 2,
  );
  TestValidator.predicate(
    "all search results belong to the correct community",
    searchByCommunity.data.every((m) => m.community.name === community.name),
  );
  // Step 6: Search by moderator username
  const searchByUsername =
    await api.functional.communityPlatform.moderators.index(ownerConnection, {
      body: {
        search: moderator.username,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(searchByUsername);
  TestValidator.predicate(
    "search by username returns at least one record",
    searchByUsername.data.length >= 1,
  );
  TestValidator.predicate(
    "all search results contain the moderator's username",
    searchByUsername.data.every(
      (m) => m.member.username === moderator.username,
    ),
  );
  // Step 7: Sort by -created_at (newest first)
  const sortedDesc = await api.functional.communityPlatform.moderators.index(
    ownerConnection,
    {
      body: {
        sort: "-created_at",
        limit: 100,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(sortedDesc);
  for (let i = 1; i < sortedDesc.data.length; i++) {
    TestValidator.predicate(
      `-created_at order at index ${i}`,
      sortedDesc.data[i - 1].created_at >= sortedDesc.data[i].created_at,
    );
  }
  // Step 8: Sort by role (ascending — moderator before owner alphabetically)
  const sortedByRole = await api.functional.communityPlatform.moderators.index(
    ownerConnection,
    {
      body: {
        sort: "role",
        limit: 100,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(sortedByRole);
  TestValidator.predicate(
    "sort by role returns results",
    sortedByRole.data.length >= 2,
  );
  for (let i = 1; i < sortedByRole.data.length; i++) {
    TestValidator.predicate(
      `role order at index ${i}`,
      sortedByRole.data[i - 1].role <= sortedByRole.data[i].role,
    );
  }
}
