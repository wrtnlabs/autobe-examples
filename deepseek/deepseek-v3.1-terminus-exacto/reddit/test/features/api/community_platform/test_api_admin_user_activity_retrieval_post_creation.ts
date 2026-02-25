import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_user_activity_retrieval_post_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: "admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create a post as the user to generate activity
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: RandomGenerator.alphabets(10),
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Since we don't have an endpoint to list activities or get the activity ID from post creation,
  // we need to test the retrieval endpoint with a valid activity ID structure
  // This tests that admins can access the endpoint with proper authentication
  // Generate a valid UUID for testing the endpoint
  const testActivityId = typia.random<string & tags.Format<"uuid">>();
  const activity =
    await api.functional.communityPlatform.admin.user_activities.at(
      adminConnection,
      {
        userActivityId: testActivityId,
      },
    );
  typia.assert(activity);
  // 5. Validate the activity record structure matches the DTO definition
  TestValidator.equals("activity ID matches", activity.id, testActivityId);
  TestValidator.predicate(
    "activity type is string",
    typeof activity.activity_type === "string",
  );
  TestValidator.predicate(
    "activity has valid creation timestamp",
    typeof activity.created_at === "string",
  );
  TestValidator.predicate(
    "activity has user reference",
    typeof activity.user.id === "string",
  );
  TestValidator.predicate(
    "activity has user summary",
    typeof activity.user.username === "string",
  );
  // Validate optional fields that may be present
  if (
    activity.content_created !== null &&
    activity.content_created !== undefined
  ) {
    TestValidator.predicate(
      "content created flag is boolean",
      typeof activity.content_created === "boolean",
    );
  }
  if (
    activity.engagement_score !== null &&
    activity.engagement_score !== undefined
  ) {
    TestValidator.predicate(
      "engagement score is number",
      typeof activity.engagement_score === "number",
    );
  }
  // Validate post reference if present (for post creation activities)
  if (activity.post !== null && activity.post !== undefined) {
    TestValidator.predicate(
      "post reference has valid ID",
      typeof activity.post.id === "string",
    );
    TestValidator.predicate(
      "post reference has title",
      typeof activity.post.title === "string",
    );
    TestValidator.predicate(
      "post reference has author",
      typeof activity.post.author.id === "string",
    );
  }
}
