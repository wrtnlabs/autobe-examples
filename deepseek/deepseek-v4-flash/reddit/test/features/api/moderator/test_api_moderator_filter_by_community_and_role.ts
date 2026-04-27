import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_moderator_filter_by_community_and_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community (owner is auto-assigned as owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a second member to be appointed as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // 4. Appoint the second member as moderator
  const moderator =
    await generate_random_community_platform_member_moderators_create(
      ownerConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: moderatorMember.username,
        },
      },
    );
  typia.assert(moderator);
  // 5. Filter by community_id and role='owner'
  const ownerResult = await api.functional.communityPlatform.moderators.index(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        role: "owner",
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(ownerResult);
  TestValidator.equals("owner count", ownerResult.data.length, 1);
  const ownerRecord = ownerResult.data[0]!;
  TestValidator.equals("owner role", ownerRecord.role, "owner");
  TestValidator.equals("owner appointed_by", ownerRecord.appointed_by, null);
  TestValidator.equals(
    "owner community id",
    ownerRecord.community.id,
    community.id,
  );
  // 6. Filter by community_id and role='moderator'
  const moderatorResult =
    await api.functional.communityPlatform.moderators.index(ownerConnection, {
      body: {
        community_id: community.id,
        role: "moderator",
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(moderatorResult);
  TestValidator.equals("moderator count", moderatorResult.data.length, 1);
  const moderatorRecord = moderatorResult.data[0]!;
  TestValidator.equals("moderator role", moderatorRecord.role, "moderator");
  TestValidator.notEquals(
    "moderator appointed_by",
    moderatorRecord.appointed_by,
    null,
  );
  TestValidator.equals(
    "moderator community id",
    moderatorRecord.community.id,
    community.id,
  );
}
