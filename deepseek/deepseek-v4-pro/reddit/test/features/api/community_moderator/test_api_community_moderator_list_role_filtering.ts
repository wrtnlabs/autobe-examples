import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";

/**
 * Test role-based filtering of the community moderator governance roster.
 *
 * Validates that the moderator listing endpoint correctly supports filtering by governance role type — returning only the owner when filtering by "owner" and only appointed moderators when filtering by "moderator". Also confirms that the unfiltered list includes both roles in the expected hierarchical order and that metadata fields like added_by correctly distinguish system-assigned ownership from user-appointed moderator roles.
 *
 * 1. Register a member as community owner and create a new community.
 * 2. Register a second member and add them as a moderator to the community.
 * 3. Retrieve the full moderator list (no role filter) — verify both owner and moderator are present, owner appears first with role "owner" and added_by null, moderator appears second with role "moderator" and added_by referencing the owner.
 * 4. Filter by role="owner" — verify only the owner entry is returned.
 * 5. Filter by role="moderator" — verify only the moderator entry is returned with a non-null added_by.
 */
export async function test_api_community_moderator_list_role_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create a community owned by the authenticated owner
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Register and authenticate a second member who will be appointed as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // 4. Add the second member as a moderator to the community (performed by the owner)
  const moderatorRole =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: moderatorAuth.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorRole);
  // 5. Retrieve the full moderator list with no role filter
  const publicConnection: api.IConnection = { host: connection.host };
  const fullList =
    await api.functional.communityHub.communities.moderators.index(
      publicConnection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(fullList);
  TestValidator.equals("full list entry count", fullList.data.length, 2);
  TestValidator.equals(
    "first entry role is owner",
    fullList.data[0].role,
    "owner",
  );
  TestValidator.equals(
    "owner added_by is null",
    fullList.data[0].added_by,
    null,
  );
  TestValidator.equals(
    "owner member id matches",
    fullList.data[0].member.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "second entry role is moderator",
    fullList.data[1].role,
    "moderator",
  );
  TestValidator.equals(
    "moderator member id matches",
    fullList.data[1].member.id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "moderator added_by is not null",
    fullList.data[1].added_by !== null,
  );
  TestValidator.equals(
    "moderator added_by references owner",
    fullList.data[1].added_by!.id,
    ownerAuth.id,
  );
  // 6. Filter by role="owner" — only the community creator should be returned
  const ownerOnly =
    await api.functional.communityHub.communities.moderators.index(
      publicConnection,
      {
        communityName: community.name,
        body: { role: "owner" },
      },
    );
  typia.assert(ownerOnly);
  TestValidator.equals("owner-only list count", ownerOnly.data.length, 1);
  TestValidator.equals(
    "owner-only entry role",
    ownerOnly.data[0].role,
    "owner",
  );
  TestValidator.equals(
    "owner-only added_by is null",
    ownerOnly.data[0].added_by,
    null,
  );
  // 7. Filter by role="moderator" — only the appointed moderator should be returned
  const moderatorOnly =
    await api.functional.communityHub.communities.moderators.index(
      publicConnection,
      {
        communityName: community.name,
        body: { role: "moderator" },
      },
    );
  typia.assert(moderatorOnly);
  TestValidator.equals(
    "moderator-only list count",
    moderatorOnly.data.length,
    1,
  );
  TestValidator.equals(
    "moderator-only entry role",
    moderatorOnly.data[0].role,
    "moderator",
  );
  TestValidator.predicate(
    "moderator-only added_by is not null",
    moderatorOnly.data[0].added_by !== null,
  );
  TestValidator.equals(
    "moderator-only added_by references owner",
    moderatorOnly.data[0].added_by!.id,
    ownerAuth.id,
  );
}
