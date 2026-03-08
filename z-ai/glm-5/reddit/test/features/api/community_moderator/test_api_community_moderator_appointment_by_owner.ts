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

/**
 * Test the complete workflow of a community owner appointing a new moderator.
 *
 * Scenario:
 * 1. Owner member joins and authenticates
 * 2. A second member joins (to be appointed as moderator)
 * 3. Owner creates a community
 * 4. Owner appoints the second member as moderator
 * 5. Validate moderator record details
 */
export async function test_api_community_moderator_appointment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member joins and authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Second member joins (to be appointed as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // 3. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Validate owner is correctly set
  TestValidator.equals(
    "community owner is creator",
    community.owner.id,
    owner.id,
  );
  // 4. Owner appoints the second member as moderator
  const moderatorRecord =
    await api.functional.communityPlatform.member.communities.moderators.addModerator(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          username: moderatorMember.username,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  // 5. Validate moderator record details
  TestValidator.equals(
    "community reference correct",
    moderatorRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name correct",
    moderatorRecord.community.name,
    community.name,
  );
  TestValidator.equals(
    "member reference correct",
    moderatorRecord.member.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "member username correct",
    moderatorRecord.member.username,
    moderatorMember.username,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    moderatorRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    moderatorRecord.updated_at.length > 0,
  );
}
