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
 * Test that a non-owner member cannot upload an icon to a community they do not own.
 *
 * Scenario:
 * 1. Member A registers and creates a community (becomes owner)
 * 2. Member B registers as a separate member
 * 3. Member B attempts to upload icon to Member A's community
 * 4. Verify 403 Forbidden is returned
 */
export async function test_api_community_icon_unauthorized_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Store the original icon value (should be null for new community)
  const originalIcon = community.icon;
  // 2. Member B registers as a separate member (not owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member B attempts to upload icon to Member A's community
  // This should fail with 403 Forbidden since Member B is not the owner
  await TestValidator.httpError(
    "non-owner cannot upload community icon",
    403,
    async () =>
      await api.functional.communityPlatform.member.communities.icon.postByCommunityname(
        memberBConnection,
        {
          communityName: community.name,
          body: {
            imageUrl: "https://example.com/icon.png",
          } satisfies ICommunityPlatformCommunity.IIconCreate,
        },
      ),
  );
}
