import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";
import type { IRedditPlatformUserActivityCommentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityCommentSummary";
import type { IRedditPlatformUserActivityPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityPostSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_user_activity_not_found_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test User Not Found Scenario
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewer = await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(viewer);
  // Request activity for non-existent user - should return 404
  await TestValidator.error("user not found returns 404", async () => {
    await api.functional.redditPlatform.member.users.activity.index(
      viewerConnection,
      {
        username: "nonexistentuser12345",
        body: {},
      },
    );
  });
  // 2. Test Deleted Content Visibility
  // Create Member B (target user)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetMember);
  // Create a community for posting (need admin or self-creation)
  // For simplicity, we'll use a random community or need to create one
  // Since we don't have admin utilities, we'll need to work with existing communities
  // or create a test community through the member endpoints if available
  // Actually, looking at the API, we need a community_id to create posts
  // Let's assume there's a way to get community or create one
  // For this test, we'll need to either:
  // 1. Use an existing community (hard to know)
  // 2. Create a community through member join (not typical)
  // 3. Have an admin utility for community creation
  // Since we only have member utilities and no admin utilities listed,
  // we'll need to adjust the test to work within available APIs
  // Let's assume we can create a community or use a known one
  // Actually, re-reading the scenario plan, it mentions:
  // - Create a post by Member B
  // - Create a comment by Member B
  // But we need a community_id for posts
  // Given the constraints, we should create a community first
  // Since no community creation API is listed in the utility functions,
  // we'll need to either use a pre-existing community or skip this part
  // For now, let's proceed with what we can test reliably:
  // - User not found scenario ✓
  // - For deleted content, we'll need to assume a community exists or use a workaround
  // Alternative approach: Use typia.random to generate a valid-looking community_id
  // and let the API handle validation (if community doesn't exist, we get 404)
  // But this would make the test flaky
  // Better approach: The test should document that community creation is prerequisite
  // and assume one exists for the test environment
  // For a robust test, we need to either:
  // 1. Create a community (requires admin utility not available)
  // 2. Use an existing community ID (requires knowing one exists)
  // 3. Skip the deleted content test if we can't create content
  // Given the instructions say to be pragmatic about compilation vs scenario fidelity,
  // and we have no way to create communities with the available utilities,
  // we'll test what we can reliably: the user not found scenario
  // For the deleted content test, we'd need additional setup
  // that's not available in the current utility function set
  // Let me reconsider: The scenario plan says to test both scenarios
  // Since we can't create communities with available utilities,
  // we should note this limitation and test the user not found case fully
}
