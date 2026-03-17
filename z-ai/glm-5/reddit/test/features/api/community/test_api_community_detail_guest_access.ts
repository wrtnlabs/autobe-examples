import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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

export async function test_api_community_detail_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community to retrieve
  const communityName = RandomGenerator.name();
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        },
      },
    );
  typia.assert(community);
  // 3. Access community detail as guest (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  const communityDetail = await api.functional.communityPlatform.communities.at(
    guestConnection,
    { communityId: community.id },
  );
  typia.assert(communityDetail);
  // 4. Verify all expected fields
  TestValidator.equals("community id", communityDetail.id, community.id);
  TestValidator.equals("community name", communityDetail.name, communityName);
  TestValidator.equals(
    "community description",
    communityDetail.description,
    communityDescription,
  );
  TestValidator.equals("subscriber count", communityDetail.subscriberCount, 0);
  TestValidator.equals("icon is null", communityDetail.icon, null);
  TestValidator.equals("deleted at is null", communityDetail.deletedAt, null);
  // Verify owner information matches creating member
  TestValidator.equals("owner id", communityDetail.owner.id, member.id);
  TestValidator.equals(
    "owner username",
    communityDetail.owner.username,
    member.username,
  );
  TestValidator.equals(
    "owner display name",
    communityDetail.owner.displayName,
    member.displayName,
  );
  TestValidator.equals("owner bio", communityDetail.owner.bio, member.bio);
  TestValidator.equals(
    "owner karma",
    communityDetail.owner.karma,
    member.karma,
  );
}
