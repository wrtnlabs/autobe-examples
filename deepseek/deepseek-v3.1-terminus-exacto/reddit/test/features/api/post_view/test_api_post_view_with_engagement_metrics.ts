import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_posts_view_create } from "../../../generate/generate_random_community_platform_posts_view_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_view } from "../../../prepare/prepare_random_community_platform_post_view";

export async function test_api_post_view_with_engagement_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Since community creation utilities are not available, we'll test the view endpoint
  // with a focus on the engagement metrics functionality rather than full post creation flow
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Note: We cannot create a post without community creation utilities
  // The test will focus on validating the view endpoint's engagement metrics functionality
  // using the available APIs and utilities
  // For this test, we'll assume there's an existing post available for view tracking
  // and focus on testing the engagement metrics collection
  // 2. Test comprehensive view with all analytics fields populated
  // Using a mock post ID since we can't create posts without communities
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  const comprehensiveView =
    await generate_random_community_platform_posts_view_create(userConnection, {
      params: { postId: mockPostId },
      body: {
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        referrer: typia.random<string & tags.Format<"uri">>(),
        view_duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies ICommunityPlatformPostView.ICreate,
    });
  typia.assert(comprehensiveView);
  // Validate comprehensive view data structure
  TestValidator.equals(
    "post ID matches input",
    comprehensiveView.post.id,
    mockPostId,
  );
  TestValidator.equals("user ID matches", comprehensiveView.user?.id, user.id);
  TestValidator.predicate(
    "has IP address",
    comprehensiveView.ip_address !== null &&
      comprehensiveView.ip_address !== undefined,
  );
  TestValidator.predicate(
    "has user agent",
    comprehensiveView.user_agent !== null &&
      comprehensiveView.user_agent !== undefined,
  );
  TestValidator.predicate(
    "has referrer",
    comprehensiveView.referrer !== null &&
      comprehensiveView.referrer !== undefined,
  );
  TestValidator.predicate(
    "has view duration",
    comprehensiveView.view_duration !== null &&
      comprehensiveView.view_duration !== undefined,
  );
  // 3. Test minimal view with null values for all optional fields
  const minimalView =
    await generate_random_community_platform_posts_view_create(userConnection, {
      params: { postId: mockPostId },
      body: {
        ip_address: null,
        user_agent: null,
        referrer: null,
        view_duration: null,
      } satisfies ICommunityPlatformPostView.ICreate,
    });
  typia.assert(minimalView);
  // Validate minimal view data
  TestValidator.equals(
    "post ID matches in minimal view",
    minimalView.post.id,
    mockPostId,
  );
  TestValidator.equals(
    "user ID matches in minimal view",
    minimalView.user?.id,
    user.id,
  );
  TestValidator.equals("IP address is null", minimalView.ip_address, null);
  TestValidator.equals("user agent is null", minimalView.user_agent, null);
  TestValidator.equals("referrer is null", minimalView.referrer, null);
  TestValidator.equals(
    "view duration is null",
    minimalView.view_duration,
    null,
  );
  // 4. Test edge cases with special characters and long durations
  const edgeCaseView =
    await generate_random_community_platform_posts_view_create(userConnection, {
      params: { postId: mockPostId },
      body: {
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
        user_agent:
          "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0; 🚀🚀🚀)",
        referrer:
          "https://example.com/path with spaces/and%20special%20chars.html",
        view_duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<86400>
        >(), // Up to 24 hours
      } satisfies ICommunityPlatformPostView.ICreate,
    });
  typia.assert(edgeCaseView);
  // Validate edge case view data
  TestValidator.equals(
    "post ID matches in edge case",
    edgeCaseView.post.id,
    mockPostId,
  );
  TestValidator.equals(
    "user ID matches in edge case",
    edgeCaseView.user?.id,
    user.id,
  );
  TestValidator.predicate(
    "edge case has valid view duration",
    edgeCaseView.view_duration !== null &&
      edgeCaseView.view_duration !== undefined &&
      edgeCaseView.view_duration >= 0,
  );
  // 5. Test anonymous view (no user authentication)
  const anonymousConnection: api.IConnection = { host: connection.host };
  const anonymousView =
    await generate_random_community_platform_posts_view_create(
      anonymousConnection,
      {
        params: { postId: mockPostId },
        body: {
          ip_address: typia.random<string & tags.Format<"ipv4">>(),
          user_agent:
            "Mozilla/5.0 (compatible; Bot/2.1; +http://example.com/bot)",
          referrer: null,
          view_duration: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<30>
          >(),
        } satisfies ICommunityPlatformPostView.ICreate,
      },
    );
  typia.assert(anonymousView);
  // Validate anonymous view data
  TestValidator.equals(
    "post ID matches in anonymous view",
    anonymousView.post.id,
    mockPostId,
  );
  TestValidator.equals(
    "user is null for anonymous view",
    anonymousView.user,
    null,
  );
  TestValidator.predicate(
    "anonymous view has IP address",
    anonymousView.ip_address !== null && anonymousView.ip_address !== undefined,
  );
  // Final validation: Ensure all views have unique IDs and proper timestamps
  const viewIds = [
    comprehensiveView.id,
    minimalView.id,
    edgeCaseView.id,
    anonymousView.id,
  ];
  TestValidator.predicate(
    "all view IDs are unique",
    new Set(viewIds).size === viewIds.length,
  );
  TestValidator.predicate(
    "all views have creation timestamps",
    comprehensiveView.created_at !== undefined &&
      minimalView.created_at !== undefined &&
      edgeCaseView.created_at !== undefined &&
      anonymousView.created_at !== undefined,
  );
}
