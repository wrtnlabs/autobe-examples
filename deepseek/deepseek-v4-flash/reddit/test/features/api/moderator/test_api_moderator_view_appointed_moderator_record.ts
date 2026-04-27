import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test retrieving the moderator record for an appointed (non-owner) moderator.
 *
 * Validates the full lifecycle: community owner registration → community creation → appointment of a second member as moderator → retrieval of the moderator record by its unique ID. Ensures the response correctly identifies the moderator role, the appointing member, the scoped community, and the assigned member.
 *
 * Special attention is given to verifying that the `appointed_by` field is populated with the owner's information (distinguishes an appointed moderator from the owner), and that the `role` is exactly `"moderator"` (not `"owner"`).
 *
 * 1. Community owner registers and creates a community.
 * 2. A second member registers to be appointed as moderator.
 * 3. The owner appoints the second member as a moderator via the appointment endpoint.
 * 4. The moderator record is retrieved by its ID.
 * 5. Validates that the returned role is `"moderator"`, `appointed_by` contains the owner's summary, the `member` matches the appointed member, the `community` matches the created community, and timestamps are present.
 */
export async function test_api_moderator_view_appointed_moderator_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner and create a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
        },
      },
    );
  typia.assert(community);
  // 2. Register the future moderator
  const futureModeratorConnection: api.IConnection = { host: connection.host };
  const futureModerator = await authorize_member_join(
    futureModeratorConnection,
    {},
  );
  typia.assert(futureModerator);
  // 3. Owner appoints the second member as a moderator
  const moderator =
    await generate_random_community_platform_member_moderators_create(
      ownerConnection,
      {
        body: {
          communityName: communityName,
          memberUsername: futureModerator.username,
        },
      },
    );
  typia.assert(moderator);
  // 4. Retrieve the moderator record by ID
  const retrieved = await api.functional.communityPlatform.moderators.at(
    connection,
    {
      moderatorId: moderator.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate the retrieved moderator record
  TestValidator.equals("role is moderator", retrieved.role, "moderator");
  TestValidator.predicate(
    "appointed_by is not null",
    () => retrieved.appointed_by !== null,
  );
  TestValidator.equals(
    "appointed_by member id matches owner",
    retrieved.appointed_by!.id,
    owner.id,
  );
  TestValidator.equals(
    "member id matches appointed moderator",
    retrieved.member.id,
    futureModerator.id,
  );
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    () => typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () => typeof retrieved.updated_at === "string",
  );
}
