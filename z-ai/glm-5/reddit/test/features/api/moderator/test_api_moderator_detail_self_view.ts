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

export async function test_api_moderator_detail_self_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create community
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // 4. Owner appoints the member as moderator
  const moderator =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        body: {
          username: moderatorAuth.username,
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderator);
  // 5. Moderator views their own moderator details
  const moderatorDetail =
    await api.functional.communityPlatform.communities.moderators.at(
      moderatorConnection,
      {
        communityName: community.name,
        moderatorId: moderator.id,
      },
    );
  typia.assert(moderatorDetail);
  // 6. Validate response
  TestValidator.equals(
    "moderator id matches",
    moderatorDetail.id,
    moderator.id,
  );
  TestValidator.equals(
    "community id matches",
    moderatorDetail.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    moderatorDetail.community.name,
    community.name,
  );
  TestValidator.equals(
    "member id matches",
    moderatorDetail.member.id,
    moderatorAuth.member.id,
  );
  TestValidator.equals(
    "member username matches",
    moderatorDetail.member.username,
    moderatorAuth.username,
  );
  TestValidator.predicate(
    "created_at is valid date",
    moderatorDetail.created_at.length > 0,
  );
}
