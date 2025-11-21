import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSUserActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSUserActivitySummary";

export async function test_api_user_activity_retrieval_by_citizen(
  connection: api.IConnection,
) {
  // Step 1: Create a new citizen account to establish authentication context
  const citizenData = typia.random<ICommunityBBSCitizenICreate>();
  const authResponse: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: citizenData,
    });
  typia.assert(authResponse);

  // Step 2: Retrieve the citizen's user activity summary
  const activitySummary: ICommunityBBSUserActivitySummary =
    await api.functional.communityBBS.dashboard.user_activity.index(connection);
  typia.assert(activitySummary);

  // Step 3: Validate that the returned summary contains the expected citizenId
  TestValidator.equals(
    "citizenId in activity summary matches authenticated citizen",
    activitySummary.citizenId,
    authResponse.id,
  );

  // Step 4: Validate required numeric metrics are non-negative integers
  TestValidator.predicate(
    "postCount is non-negative integer",
    activitySummary.postCount >= 0,
  );
  TestValidator.predicate(
    "commentCount is non-negative integer",
    activitySummary.commentCount >= 0,
  );
  TestValidator.predicate(
    "replyCount is non-negative integer",
    activitySummary.replyCount >= 0,
  );
  TestValidator.predicate(
    "upvoteCount is non-negative integer",
    activitySummary.upvoteCount >= 0,
  );
  TestValidator.predicate(
    "downvoteCount is non-negative integer",
    activitySummary.downvoteCount >= 0,
  );
  TestValidator.predicate(
    "reportCount is non-negative integer",
    activitySummary.reportCount >= 0,
  );
  TestValidator.predicate(
    "reportApprovedCount is non-negative integer",
    activitySummary.reportApprovedCount >= 0,
  );
}
