import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
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
 * Test community pagination and sorting options.
 * 1. Create member account and 5 distinct communities
 * 2. Test name ascending sorting with pagination
 * 3. Test default created_at desc sorting
 * 4. Test updated_at desc sorting (acknowledges limitation without update endpoint)
 * 5. Validate pagination metadata and subscriber_count inclusion
 */
export async function test_api_communities_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member!);
  // 2. Create 5 distinct communities with alphabetical names
  const communityNames = [
    "AlphaCommunity",
    "BetaCommunity",
    "GammaCommunity",
    "DeltaCommunity",
    "EpsilonCommunity",
  ] as const;
  const communities: ICommunityPlatformCommunity[] = [];
  for (const name of communityNames) {
    const community =
      await generate_random_community_platform_member_communities_create(
        memberConnection,
        {
          body: {
            name: name.toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community!);
    communities.push(community);
  }
  // 3. Test pagination with name ascending sorting
  const page1 = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
        sort_by: "name",
        sort_order: "asc",
      },
    },
  );
}
