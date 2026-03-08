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
 * Test that a community owner can replace an existing icon with a new one.
 *
 * Prerequisites:
 * 1. Member registers and authenticates via member join
 * 2. Member creates a community (automatically becomes owner)
 *
 * Test Steps:
 * 1. Upload first icon via POST /communityPlatform/member/communities/{communityName}/icon
 * 2. Verify first icon is stored and community is updated
 * 3. Upload a second, different icon via the same endpoint
 * 4. Verify response returns the updated community with NEW icon URL
 * 5. Validate the community's 'icon' field now contains the new icon URL
 * 6. Verify 'updatedAt' timestamp reflects the second upload
 */
export async function test_api_community_icon_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - authenticate via member join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community (member becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload first icon
  const firstIconUrl = typia.random<string & tags.Format<"uri">>();
  const communityWithFirstIcon =
    await api.functional.communityPlatform.member.communities.icon.postByCommunityname(
      memberConnection,
      {
        communityName: community.name,
        body: {
          imageUrl: firstIconUrl,
        } satisfies ICommunityPlatformCommunity.IIconCreate,
      },
    );
  typia.assert(communityWithFirstIcon);
  // 4. Verify first icon was set
  TestValidator.predicate(
    "first icon is set",
    communityWithFirstIcon.icon !== null,
  );
  const firstIconValue = communityWithFirstIcon.icon;
  const firstUpdatedAt = communityWithFirstIcon.updatedAt;
  // 5. Upload second icon (replacement)
  const secondIconUrl = typia.random<string & tags.Format<"uri">>();
  const communityWithSecondIcon =
    await api.functional.communityPlatform.member.communities.icon.postByCommunityname(
      memberConnection,
      {
        communityName: community.name,
        body: {
          imageUrl: secondIconUrl,
        } satisfies ICommunityPlatformCommunity.IIconCreate,
      },
    );
  typia.assert(communityWithSecondIcon);
  // 6. Verify icon was replaced (new icon URL is different from first)
  TestValidator.notEquals(
    "icon was replaced",
    communityWithSecondIcon.icon,
    firstIconValue,
  );
  TestValidator.predicate(
    "second icon is set",
    communityWithSecondIcon.icon !== null,
  );
  // 7. Verify updatedAt timestamp was updated
  TestValidator.notEquals(
    "updatedAt changed",
    communityWithSecondIcon.updatedAt,
    firstUpdatedAt,
  );
}
