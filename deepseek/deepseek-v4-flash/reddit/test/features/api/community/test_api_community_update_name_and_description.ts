import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that the community owner can successfully update the community name and description.
 *
 * Registers a new member, creates a community, then updates its name and description.
 * Validates that the updated community reflects the new values, the updated_at timestamp
 * is refreshed, the subscriber count remains unchanged (0), and the owner reference
 * still points to the original creator.
 *
 * 1. Register a new member via POST /auth/member/join.
 * 2. Create a community via POST /member/communities.
 * 3. Update the community name and description via PUT /member/communities/{communityId}.
 * 4. Validate that the response contains the new name and description, updated_at differs,
 *    subscriber_count is unchanged (0), and owner id matches.
 */
export async function test_api_community_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Prepare new name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  // 4. Update community name and description
  const updated =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          name: newName,
          description: newDescription,
        },
      },
    );
  typia.assert(updated);
  // 5. Validate updated community fields
  TestValidator.equals("name updated", updated.name, newName);
  TestValidator.equals(
    "description updated",
    updated.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updated.updatedAt,
    community.updatedAt,
  );
  TestValidator.equals(
    "subscriber count unchanged",
    updated.subscriberCount,
    community.subscriberCount,
  );
  TestValidator.equals("owner unchanged", updated.owner.id, community.owner.id);
}
