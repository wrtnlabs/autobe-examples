import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feedview_retrieval_complete(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random feed view ID for testing
  const randomViewId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the feed view using the generated ID
  const retrievedView = await api.functional.redditPlatform.views.at(
    connection,
    {
      viewId: randomViewId,
    },
  );
  typia.assert(retrievedView);
  // Validate the retrieved view has all required fields
  TestValidator.equals("view ID matches", retrievedView.id, randomViewId);
  TestValidator.equals(
    "user ID exists",
    retrievedView.userId !== null && retrievedView.userId !== undefined,
    true,
  );
  TestValidator.predicate(
    "feed result ID is valid UUID or null",
    retrievedView.feedResultId === null ||
      (retrievedView.feedResultId !== null &&
        retrievedView.feedResultId !== undefined),
  );
  TestValidator.predicate(
    "community ID is valid UUID or null",
    retrievedView.communityId === null ||
      (retrievedView.communityId !== null &&
        retrievedView.communityId !== undefined),
  );
  TestValidator.equals(
    "session ID exists",
    retrievedView.sessionId !== null &&
      retrievedView.sessionId !== undefined &&
      retrievedView.sessionId.length > 0,
    true,
  );
  TestValidator.equals(
    "feed type exists",
    retrievedView.feedType !== null &&
      retrievedView.feedType !== undefined &&
      retrievedView.feedType.length > 0,
    true,
  );
  TestValidator.predicate(
    "user agent is valid or null",
    retrievedView.userAgent === null ||
      (retrievedView.userAgent !== null &&
        retrievedView.userAgent !== undefined),
  );
  TestValidator.predicate(
    "IP address is valid or null",
    retrievedView.ipAddress === null ||
      (retrievedView.ipAddress !== null &&
        retrievedView.ipAddress !== undefined),
  );
  TestValidator.predicate(
    "viewed at is valid date-time",
    retrievedView.viewedAt !== null &&
      retrievedView.viewedAt !== undefined &&
      !isNaN(new Date(retrievedView.viewedAt).getTime()),
  );
  TestValidator.predicate(
    "engagement duration is valid or null",
    retrievedView.engagementDuration === null ||
      (retrievedView.engagementDuration !== null &&
        retrievedView.engagementDuration !== undefined),
  );
  TestValidator.predicate(
    "items viewed is valid or null",
    retrievedView.itemsViewed === null ||
      (retrievedView.itemsViewed !== null &&
        retrievedView.itemsViewed !== undefined),
  );
  TestValidator.predicate(
    "created at is valid date-time",
    retrievedView.createdAt !== null &&
      retrievedView.createdAt !== undefined &&
      !isNaN(new Date(retrievedView.createdAt).getTime()),
  );
  // Validate nested relationships exist when present
  if (
    retrievedView.user !== null &&
    retrievedView.user !== undefined &&
    retrievedView.user.id !== null &&
    retrievedView.user.id !== undefined
  ) {
    TestValidator.equals(
      "user username exists",
      retrievedView.user.username !== null &&
        retrievedView.user.username !== undefined &&
        retrievedView.user.username.length > 0,
      true,
    );
  }
  if (
    retrievedView.feedResult !== null &&
    retrievedView.feedResult !== undefined &&
    retrievedView.feedResult.id !== null &&
    retrievedView.feedResult.id !== undefined
  ) {
    TestValidator.equals(
      "feed result post ID exists",
      retrievedView.feedResult.postId !== null &&
        retrievedView.feedResult.postId !== undefined,
      true,
    );
    TestValidator.equals(
      "feed result post title exists",
      retrievedView.feedResult.postTitle !== null &&
        retrievedView.feedResult.postTitle !== undefined &&
        retrievedView.feedResult.postTitle.length > 0,
      true,
    );
    TestValidator.equals(
      "feed result post type exists",
      retrievedView.feedResult.postType !== null &&
        retrievedView.feedResult.postType !== undefined &&
        retrievedView.feedResult.postType.length > 0,
      true,
    );
  }
  if (
    retrievedView.community !== null &&
    retrievedView.community !== undefined &&
    retrievedView.community.id !== null &&
    retrievedView.community.id !== undefined
  ) {
    TestValidator.equals(
      "community name exists",
      retrievedView.community.name !== null &&
        retrievedView.community.name !== undefined &&
        retrievedView.community.name.length > 0,
      true,
    );
    TestValidator.predicate(
      "community subscriber count is non-negative",
      retrievedView.community.subscriberCount === null ||
        retrievedView.community.subscriberCount === undefined ||
        retrievedView.community.subscriberCount >= 0,
    );
  }
}
