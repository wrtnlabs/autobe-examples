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

export async function test_api_community_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first community with name 'tech-news'
  const firstCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "tech-news",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(firstCommunity);
  // 3. Create second community with name 'gaming-hub'
  const secondCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "gaming-hub",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(secondCommunity);
  // Store original values for verification
  const originalName = secondCommunity.name;
  const originalDescription = secondCommunity.description;
  // 4. Attempt to update second community's name to 'tech-news' (exact match) - should fail
  await TestValidator.error(
    "should reject update with existing name",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        memberConnection,
        {
          communityName: originalName,
          body: {
            name: "tech-news",
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
  // 5. Attempt to update second community's name to 'TECH-NEWS' (case variation) - should fail
  await TestValidator.error(
    "should reject update with case-insensitive duplicate name",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        memberConnection,
        {
          communityName: originalName,
          body: {
            name: "TECH-NEWS",
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
  // 6. Verify second community can still be updated using original name
  // This proves the name was never changed by the failed attempts
  const verifiedCommunity =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityName: originalName,
        body: {
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(verifiedCommunity);
  // Verify name remained unchanged through all failed attempts
  TestValidator.equals(
    "community name unchanged after failed updates",
    verifiedCommunity.name,
    originalName,
  );
}
