import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityIcon";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test retrieving the icon URL for a community that has an uploaded icon image.
 *
 * This test validates that:
 * 1. A community owner can create a community with an icon URL
 * 2. Any user (including guests) can retrieve the community's icon
 * 3. The returned icon URL matches what was set during community creation
 */
export async function test_api_community_icon_retrieval_with_uploaded_icon(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community with an icon URL
  const iconUrl = typia.random<string & tags.Format<"url">>();
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          icon: iconUrl,
        },
      },
    );
  typia.assert(community);
  // Step 3: Retrieve the community's icon (public endpoint - no auth required)
  const iconResponse =
    await api.functional.communityPlatform.communities.icon.at(connection, {
      communityId: community.id,
    });
  typia.assert(iconResponse);
  // Step 4: Validate the icon URL matches
  TestValidator.equals("icon URL matches", iconResponse.icon, iconUrl);
}
