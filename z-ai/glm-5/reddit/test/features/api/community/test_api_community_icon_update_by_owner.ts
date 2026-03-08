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

export async function test_api_community_icon_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community as the owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Store original data for comparison
  const originalCommunity = community;
  const newIconUrl = typia.random<string & tags.Format<"uri">>();
  // Wait a bit to ensure updated_at timestamp will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Update the community icon
  const updatedCommunity =
    await api.functional.communityPlatform.member.communities.icon.putByCommunityid(
      memberConnection,
      {
        communityId: community.id,
        body: {
          icon: newIconUrl,
        } satisfies ICommunityPlatformCommunity.IUpdateIcon,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Validate the response
  TestValidator.equals(
    "community id unchanged",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    originalCommunity.name,
  );
  TestValidator.equals(
    "community description unchanged",
    updatedCommunity.description,
    originalCommunity.description,
  );
  TestValidator.equals(
    "icon url updated",
    updatedCommunity.icon,
    newIconUrl satisfies string | null as string | null,
  );
  TestValidator.equals(
    "subscriber count preserved",
    updatedCommunity.subscriberCount,
    originalCommunity.subscriberCount,
  );
  TestValidator.equals(
    "owner id preserved",
    updatedCommunity.owner.id,
    originalCommunity.owner.id,
  );
  TestValidator.equals(
    "owner username preserved",
    updatedCommunity.owner.username,
    originalCommunity.owner.username,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedCommunity.updatedAt).getTime() >=
      new Date(originalCommunity.updatedAt).getTime(),
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedCommunity.deletedAt,
    null,
  );
}
