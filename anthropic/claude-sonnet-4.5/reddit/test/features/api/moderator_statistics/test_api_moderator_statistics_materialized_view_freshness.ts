import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorActivityStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorActivityStats";

export async function test_api_moderator_statistics_materialized_view_freshness(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for statistics access
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member account to create community
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create moderator account for statistics retrieval
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 4: Member creates a community (member is currently authenticated)
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 5: Assign moderator to community (still using member authentication as community creator)
  const moderatorAssignment = {
    moderator_id: moderator.id,
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignment,
      },
    );
  typia.assert(assignment);

  // Step 6: Administrator retrieves moderator statistics
  // Re-authenticate as admin using the initial admin account
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  const statistics: IRedditLikeModeratorActivityStats =
    await api.functional.redditLike.admin.moderators.statistics(connection, {
      moderatorId: moderator.id,
    });
  typia.assert(statistics);

  // Verify that the statistics include the last_calculated_at timestamp
  TestValidator.predicate(
    "statistics should include last_calculated_at timestamp",
    statistics.last_calculated_at !== null &&
      statistics.last_calculated_at !== undefined,
  );

  // Verify that last_calculated_at is a valid date-time string
  TestValidator.predicate(
    "last_calculated_at should be a valid date-time format",
    typeof statistics.last_calculated_at === "string" &&
      statistics.last_calculated_at.length > 0,
  );

  // Verify the statistics object contains the moderator_id we're tracking
  TestValidator.equals(
    "statistics moderator_id should match requested moderator",
    statistics.moderator_id,
    moderator.id,
  );
}
