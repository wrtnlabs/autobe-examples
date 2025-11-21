import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSUserActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSUserActivitySummary";

export async function test_api_user_activity_retrieval_with_no_activity(
  connection: api.IConnection,
) {
  // Step 1: Join as a new citizen to create an account with no activity
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // Step 2: Retrieve user activity summary for the newly created citizen with no activity
  const activitySummary: ICommunityBBSUserActivitySummary =
    await api.functional.communityBBS.dashboard.user_activity.index(connection);
  typia.assert(activitySummary);

  // Step 3: Validate the activity summary has zero counts and null timestamps
  TestValidator.equals(
    "citizenId matches the joined citizen",
    activitySummary.citizenId,
    citizen.id,
  );
  TestValidator.equals(
    "post count should be zero",
    activitySummary.postCount,
    0,
  );
  TestValidator.equals(
    "comment count should be zero",
    activitySummary.commentCount,
    0,
  );
  TestValidator.equals(
    "reply count should be zero",
    activitySummary.replyCount,
    0,
  );
  TestValidator.equals(
    "upvote count should be zero",
    activitySummary.upvoteCount,
    0,
  );
  TestValidator.equals(
    "downvote count should be zero",
    activitySummary.downvoteCount,
    0,
  );
  TestValidator.equals(
    "report count should be zero",
    activitySummary.reportCount,
    0,
  );
  TestValidator.equals(
    "report approved count should be zero",
    activitySummary.reportApprovedCount,
    0,
  );
  TestValidator.equals(
    "most active community id should be null",
    activitySummary.mostActiveCommunityId,
    null,
  );
  TestValidator.equals(
    "last post at should be null",
    activitySummary.lastPostAt,
    null,
  );
  TestValidator.equals(
    "last comment at should be null",
    activitySummary.lastCommentAt,
    null,
  );
  TestValidator.predicate(
    "createdAt is a valid date-time format",
    typia.is<string & tags.Format<"date-time">>(activitySummary.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is a valid date-time format",
    typia.is<string & tags.Format<"date-time">>(activitySummary.updatedAt),
  );
  TestValidator.predicate(
    "nextUpdateAt is a valid date-time format",
    typia.is<string & tags.Format<"date-time">>(activitySummary.nextUpdateAt),
  );
}
