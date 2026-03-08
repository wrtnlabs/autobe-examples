import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
 * Test that non-owner members cannot remove a community icon.
 * Verifies authorization restrictions on icon removal endpoint.
 */
export async function test_api_community_icon_removal_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection for Member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create a community with icon as Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          icon: "https://example.com/icon.png",
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // Step 3: Create connection for Member B (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {});
  typia.assert(nonOwnerAuth);
  // Step 4: Member B attempts to remove the icon (should fail with 403)
  await TestValidator.httpError(
    "non-owner cannot remove community icon",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.icon.erase(
        nonOwnerConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
