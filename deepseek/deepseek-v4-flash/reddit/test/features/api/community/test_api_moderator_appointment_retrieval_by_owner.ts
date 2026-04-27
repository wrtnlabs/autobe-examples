import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
 * Test that a community owner can retrieve the full details of a moderator appointment they created.
 *
 * Validates the complete appointment retrieval workflow: member registration, community creation, moderator appointment, and retrieval of the appointment record. Ensures that the returned appointment data correctly references the appointed member, the community, and the appointing owner, with valid timestamps.
 *
 * 1. Member A joins the platform and creates a community, becoming its owner.
 * 2. Member B joins the platform with a known username.
 * 3. Using Member A's session, Member B is appointed as a moderator of the community.
 * 4. Using Member A's session, the moderator appointment record is retrieved via the GET endpoint.
 * 5. Validates that all appointment fields match the expected values.
 */
export async function test_api_moderator_appointment_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 2. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(memberB);
  // 3. Appoint member B as a moderator using member A's session
  const appointment =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberB.username,
        },
      },
    );
  typia.assert(appointment);
  // 4. Retrieve the appointment using the GET endpoint
  const retrieved =
    await api.functional.communityPlatform.communities.appointed_moderators.at(
      memberAConnection,
      {
        communityId: community.id,
        appointmentId: appointment.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate the appointment details
  TestValidator.equals("appointment id matches", retrieved.id, appointment.id);
  TestValidator.equals("appointed member id", retrieved.member.id, memberB.id);
  TestValidator.equals(
    "appointed member username",
    retrieved.member.username,
    memberB.username,
  );
  TestValidator.equals("community id", retrieved.community.id, community.id);
  TestValidator.equals(
    "community name",
    retrieved.community.name,
    community.name,
  );
  TestValidator.equals(
    "appointer member id",
    retrieved.appointedBy.id,
    memberA.id,
  );
  TestValidator.equals(
    "appointer member username",
    retrieved.appointedBy.username,
    memberA.username,
  );
}
