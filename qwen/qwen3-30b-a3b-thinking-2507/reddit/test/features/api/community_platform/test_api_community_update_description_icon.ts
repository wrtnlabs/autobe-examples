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

export async function test_api_community_update_description_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const authConnection = { host: connection.host };
  await authorize_member_join(authConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  // 2. Create a community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      authConnection,
      {},
    );
  typia.assert(community);
  // 3. Update community description and icon URL
  const description = RandomGenerator.paragraph({ sentences: 2 });
  // Generate simple URL string (no format tag) matching DTO constraint
  const iconUrl = RandomGenerator.paragraph({ sentences: 1 }) + ".png";
  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.update(
      authConnection,
      {
        communityId: community.id,
        body: {
          description,
          icon_url: iconUrl,
        },
      },
    );
  typia.assert(updatedCommunity);
  // 4. Validate response
  TestValidator.equals(
    "description matches",
    updatedCommunity.description,
    description,
  );
  TestValidator.equals("icon_url matches", updatedCommunity.icon_url, iconUrl);
}
