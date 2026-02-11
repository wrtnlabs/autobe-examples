import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup - register an admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(3),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a community as admin (using admin connection)
  // Note: No community creation endpoint available in provided SDK
  // This test assumes a community already exists in the test environment
  // In a real scenario, you would need a community creation endpoint
  const testCommunityId = "00000000-0000-0000-0000-000000000000";
  // Step 3: Retrieve analytics for the community
  const analytics =
    await api.functional.redditPlatform.admin.communities.analytics.at(
      adminConnection,
      {
        communityId: testCommunityId,
      },
    );
  typia.assert(analytics);
  // Step 4: Validate analytics structure and content
  TestValidator.equals(
    "communityId exists",
    typeof analytics.communityId === "string",
    true,
  );
  TestValidator.equals(
    "communityName exists",
    typeof analytics.communityName === "string",
    true,
  );
  TestValidator.equals(
    "engagement exists",
    analytics.engagement !== undefined,
    true,
  );
  TestValidator.equals("content exists", analytics.content !== undefined, true);
  TestValidator.equals("users exists", analytics.users !== undefined, true);
  TestValidator.equals("growth exists", analytics.growth !== undefined, true);
  TestValidator.equals(
    "timeRange exists",
    analytics.timeRange !== undefined,
    true,
  );
  // Validate engagement structure
  TestValidator.equals(
    "engagement.viewCount exists",
    typeof analytics.engagement.viewCount === "number",
    true,
  );
  TestValidator.equals(
    "engagement.voteCount exists",
    typeof analytics.engagement.voteCount === "number",
    true,
  );
  TestValidator.equals(
    "engagement.commentCount exists",
    typeof analytics.engagement.commentCount === "number",
    true,
  );
  TestValidator.equals(
    "engagement.averageVoteScore exists",
    typeof analytics.engagement.averageVoteScore === "number",
    true,
  );
  // Validate content structure
  TestValidator.equals(
    "content.postCount exists",
    typeof analytics.content.postCount === "number",
    true,
  );
  TestValidator.equals(
    "content.averageKarma exists",
    typeof analytics.content.averageKarma === "number",
    true,
  );
  TestValidator.equals(
    "content.contentTypes exists",
    analytics.content.contentTypes !== undefined,
    true,
  );
  // Validate contentTypes structure
  TestValidator.equals(
    "contentTypes.textPosts exists",
    typeof analytics.content.contentTypes.textPosts === "number",
    true,
  );
  TestValidator.equals(
    "contentTypes.linkPosts exists",
    typeof analytics.content.contentTypes.linkPosts === "number",
    true,
  );
  TestValidator.equals(
    "contentTypes.imagePosts exists",
    typeof analytics.content.contentTypes.imagePosts === "number",
    true,
  );
  // Validate users structure
  TestValidator.equals(
    "users.memberCount exists",
    typeof analytics.users.memberCount === "number",
    true,
  );
  TestValidator.equals(
    "users.activeMembers exists",
    typeof analytics.users.activeMembers === "number",
    true,
  );
  TestValidator.equals(
    "users.postingFrequency exists",
    typeof analytics.users.postingFrequency === "number",
    true,
  );
  // Validate growth structure
  TestValidator.equals(
    "growth.newMembers exists",
    typeof analytics.growth.newMembers === "number",
    true,
  );
  TestValidator.equals(
    "growth.newPosts exists",
    typeof analytics.growth.newPosts === "number",
    true,
  );
  TestValidator.equals(
    "growth.netSubscriberChange exists",
    typeof analytics.growth.netSubscriberChange === "number",
    true,
  );
  TestValidator.equals(
    "growth.growthRate exists",
    typeof analytics.growth.growthRate === "number",
    true,
  );
  // Validate timeRange structure
  TestValidator.equals(
    "timeRange.startDate exists",
    typeof analytics.timeRange.startDate === "string",
    true,
  );
  TestValidator.equals(
    "timeRange.endDate exists",
    typeof analytics.timeRange.endDate === "string",
    true,
  );
  TestValidator.equals(
    "timeRange.period exists",
    ["TODAY", "WEEK", "MONTH", "YEAR", "ALL_TIME"].includes(
      analytics.timeRange.period,
    ),
    true,
  );
  // Validate data types and constraints
  TestValidator.predicate(
    "viewCount is uint32",
    analytics.engagement.viewCount >= 0 &&
      analytics.engagement.viewCount <= 4294967295,
  );
  TestValidator.predicate(
    "voteCount is uint32",
    analytics.engagement.voteCount >= 0 &&
      analytics.engagement.voteCount <= 4294967295,
  );
  TestValidator.predicate(
    "commentCount is uint32",
    analytics.engagement.commentCount >= 0 &&
      analytics.engagement.commentCount <= 4294967295,
  );
  TestValidator.predicate(
    "postCount is uint32",
    analytics.content.postCount >= 0 &&
      analytics.content.postCount <= 4294967295,
  );
}
