import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_member_community_bans_create } from "../../../generate/generate_random_community_platform_member_community_bans_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_ban_reason_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as Member A (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create a community as Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Join as Member B (the user to be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. As Member A (owner), ban Member B from the community
  const ban =
    await generate_random_community_platform_member_community_bans_create(
      ownerConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: memberB.username,
          reason: "Original ban reason for testing",
        },
      },
    );
  typia.assert(ban);
  const originalCreatedAt = ban.created_at;
  // 5. As Member A (owner), update the ban reason
  const newReason = "Updated ban reason after reviewing the violation";
  const updatedBan =
    await api.functional.communityPlatform.member.community_bans.update(
      ownerConnection,
      {
        banId: ban.id,
        body: { reason: newReason } satisfies ICommunityPlatformBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate the update
  TestValidator.equals("reason updated", updatedBan.reason, newReason);
  TestValidator.predicate(
    "updated_at after original created_at",
    () => updatedBan.updated_at > originalCreatedAt,
  );
}
