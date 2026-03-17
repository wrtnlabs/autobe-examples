import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_moderator_view_colleague_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community with member A as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Create member B (first moderator - the viewer)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Add member B as a moderator to the community
  const moderatorB =
    await generate_random_community_platform_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: { memberId: memberB.id },
      },
    );
  typia.assert(moderatorB);
  // 5. Create member C (second moderator - the viewed)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 6. Add member C as another moderator to the community
  const moderatorC =
    await generate_random_community_platform_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: { memberId: memberC.id },
      },
    );
  typia.assert(moderatorC);
  // Test: Member B (moderator) views member C's moderator details
  const viewedModerator =
    await api.functional.communityPlatform.member.communities.moderators.at(
      memberBConnection,
      {
        communityId: community.id,
        moderatorId: moderatorC.id,
      },
    );
  typia.assert(viewedModerator);
  // Validate response
  TestValidator.equals("moderator id", viewedModerator.id, moderatorC.id);
  TestValidator.equals("member id", viewedModerator.member.id, memberC.id);
  TestValidator.equals(
    "community id",
    viewedModerator.community.id,
    community.id,
  );
  TestValidator.equals("role", viewedModerator.role, "moderator");
  TestValidator.equals(
    "deleted_at is null for active moderator",
    viewedModerator.deleted_at,
    null,
  );
}
