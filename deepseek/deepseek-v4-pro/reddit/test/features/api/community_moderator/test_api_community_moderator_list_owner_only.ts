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
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test that a newly created community's moderator list contains exactly one
 * entry — the community owner.
 *
 * Validates the baseline governance structure of a newly created community by
 * creating a community and immediately querying its moderator list. Confirms
 * that the list contains exactly one moderator record with role "owner", that
 * the owner's member profile information is present and matches the community
 * creator, that the added_by field is null since ownership is system-assigned
 * at creation, and that the pagination metadata correctly reports a single
 * record.
 *
 * 1. Register and authenticate as a new member.
 * 2. Create a community, automatically becoming its owner.
 * 3. Query the community's moderator list via the public endpoint.
 * 4. Verify exactly one entry with role "owner", correct member identity,
 *    null added_by, and accurate pagination metadata.
 */
export async function test_api_community_moderator_list_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community — the member becomes the owner
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Query the community's moderator list (public endpoint, no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const moderatorPage =
    await api.functional.communityHub.communities.moderators.index(
      publicConnection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(moderatorPage);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination records",
    moderatorPage.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages", moderatorPage.pagination.pages, 1);
  TestValidator.equals("data length", moderatorPage.data.length, 1);
  // 5. Validate the single moderator entry
  const moderatorEntry = moderatorPage.data[0];
  TestValidator.equals("role is owner", moderatorEntry.role, "owner");
  TestValidator.equals("added_by is null", moderatorEntry.added_by, null);
  TestValidator.equals(
    "member id matches creator",
    moderatorEntry.member.id,
    member.id,
  );
  TestValidator.equals(
    "member username matches creator",
    moderatorEntry.member.username,
    member.username,
  );
}
