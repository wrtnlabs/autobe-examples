import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that the appointed moderators list is empty when a community has no appointed moderators.
 *
 * Verifies that the PATCH endpoint for listing appointed moderators returns an empty list with zero pagination metadata when the community only has the inherent owner (who is excluded from this listing). The owner's authority is tracked via the community's owner_id field, not through the moderator appointment table.
 *
 * 1. Join as member-A (community owner) with email "owner2@test.com", username "owner_two", and password "Password1!".
 * 2. As member-A, create a community with random data using the generation utility. No moderators are appointed.
 * 3. Call PATCH /communities/{communityId}/appointed-moderators with default pagination (empty body).
 * 4. Validate: typia.assert on the response, data is empty array ([]), pagination.records is 0, pagination.pages is 0.
 */
export async function test_api_community_appointed_moderators_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member-A (community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: "owner2@test.com",
      username: "owner_two",
      password: "Password1!",
    },
  });
  typia.assert(authorized);
  // 2. Create a community (no moderators appointed)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. List appointed moderators with default pagination
  const result =
    await api.functional.communityPlatform.communities.appointed_moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(result);
  // 4. Validate: empty data array and zero pagination
  TestValidator.equals("data is empty", result.data, []);
  TestValidator.equals("pagination.records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination.pages is 0", result.pagination.pages, 0);
}
