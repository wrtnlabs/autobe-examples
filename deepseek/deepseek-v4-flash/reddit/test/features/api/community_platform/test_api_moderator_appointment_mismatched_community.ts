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
 * Test that requesting a moderator appointment with a communityId that does not match the appointment record's actual community returns a 404 Not Found error.
 *
 * Validates that the appointed-moderators GET endpoint correctly validates community-scoped access. When an appointment was created for community A but the request uses community B's ID as the communityId path parameter, the endpoint must return 404 Not Found per the specification since the appointment does not belong to the specified community.
 *
 * 1. Join as member A and create two communities (community A and community B).
 * 2. Join as member B.
 * 3. Using member A's owner session, appoint member B as a moderator of community A.
 * 4. Attempt to retrieve the appointment using community B's ID — expect 404 Not Found.
 */
export async function test_api_moderator_appointment_mismatched_community(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // 1. Join as member A
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates community A
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(communityA);
  // 3. Member A creates community B
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(communityB);
  // 4. Join as member B
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. Member A appoints member B as moderator in community A
  const appointment =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: communityA.name,
          memberUsername: memberB.username,
        },
      },
    );
  typia.assert(appointment);
  // 6. Attempt to retrieve the appointment using community B's ID (mismatch) → expect 404
  await TestValidator.httpError(
    "mismatched community returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.communities.appointed_moderators.at(
        memberAConnection,
        {
          communityId: communityB.id,
          appointmentId: appointment.id,
        },
      );
    },
  );
}
