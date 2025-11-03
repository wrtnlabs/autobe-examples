import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated admin can retrieve detailed information about
 * a specific moderator assignment in a given community.
 *
 * Steps:
 *
 * 1. Register a new admin via join
 * 2. Admin creates a new community
 * 3. Admin assigns a user as a moderator to that community
 * 4. Admin retrieves details of the moderator assignment using communityId and
 *    moderatorId
 *
 *    - Verify all returned details correspond to the created assignments and include
 *         correct audit timestamps and relationships
 * 5. Edge case: Attempt retrieval with non-existent moderatorId and expect an
 *    error
 */
export async function test_api_community_moderator_details_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    display_name: RandomGenerator.name(),
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Admin creates a new community
  const communityBody = {
    name: RandomGenerator.alphabets(10) as string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">,
    description: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<250>,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Assign a user as a community moderator
  // As there is no API to create a new user directly in the allowed functions, create a random user summary as the test's mockup for user selection
  const moderatorUser: ICommunityPlatformUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    display_name: RandomGenerator.name(),
  };

  // Actually assign the moderator using the randomly created user summary's id
  const moderatorAssignBody = {
    user_id: moderatorUser.id,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderatorAssignment =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignBody,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator assignment community id",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment user id",
    moderatorAssignment.user.id,
    moderatorUser.id,
  );
  TestValidator.equals(
    "moderator assignment user display_name",
    moderatorAssignment.user.display_name,
    moderatorUser.display_name,
  );

  // 4. Retrieve moderator assignment details using communityId & moderatorId
  const moderatorDetails =
    await api.functional.communityPlatform.admin.communities.moderators.at(
      connection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
      },
    );
  typia.assert(moderatorDetails);
  TestValidator.equals(
    "retrieved moderator assignment id",
    moderatorDetails.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "retrieved moderator assignment user id",
    moderatorDetails.user.id,
    moderatorAssignment.user.id,
  );
  TestValidator.equals(
    "retrieved moderator assignment community id",
    moderatorDetails.community.id,
    moderatorAssignment.community.id,
  );
  TestValidator.equals(
    "retrieved moderator assignment assigned timestamp",
    moderatorDetails.assigned_at,
    moderatorAssignment.assigned_at,
  );

  // 5. Edge case: Try to get details for non-existent moderatorId and expect error
  await TestValidator.error(
    "not found error for non-existent moderatorId",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.at(
        connection,
        {
          communityId: community.id,
          moderatorId: typia.random<string & tags.Format<"uuid">>(), // random, so highly likely non-existent
        },
      );
    },
  );
}
