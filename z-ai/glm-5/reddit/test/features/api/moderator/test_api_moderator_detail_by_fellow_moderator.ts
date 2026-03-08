import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_detail_by_fellow_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create first member account (Moderator A)
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorAAuth = await authorize_member_join(moderatorAConnection, {});
  typia.assert(moderatorAAuth);
  // 4. Owner appoints first member as moderator
  const moderatorARecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderatorAAuth.username },
      },
    );
  typia.assert(moderatorARecord);
  // 5. Create second member account (Moderator B)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorBAuth = await authorize_member_join(moderatorBConnection, {});
  typia.assert(moderatorBAuth);
  // 6. Owner appoints second member as moderator
  const moderatorBRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderatorBAuth.username },
      },
    );
  typia.assert(moderatorBRecord);
  // 7. Moderator A retrieves Moderator B's details using the target endpoint
  const retrievedModerator =
    await api.functional.communityPlatform.communities.moderators.at(
      moderatorAConnection,
      {
        communityName: community.name,
        moderatorId: moderatorBRecord.id,
      },
    );
  typia.assert(retrievedModerator);
  // 8. Validate response
  TestValidator.equals(
    "moderator id",
    retrievedModerator.id,
    moderatorBRecord.id,
  );
  TestValidator.equals(
    "community name",
    retrievedModerator.community.name,
    community.name,
  );
  TestValidator.equals(
    "member id",
    retrievedModerator.member.id,
    moderatorBAuth.id,
  );
  TestValidator.equals(
    "member username",
    retrievedModerator.member.username,
    moderatorBAuth.username,
  );
}
