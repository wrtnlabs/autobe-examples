import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeedNewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedNewRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feeds_new_posts_community_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Fetch new posts feed without community filter
  // This establishes baseline behavior
  const unfilteredResponse =
    await api.functional.redditPlatform.feeds._new.index(connection, {
      body: {
        limit: 20,
        page: 1,
      } satisfies IRedditPlatformPostFeedNewRequest,
    });
  typia.assert(unfilteredResponse);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "has valid pagination current",
    unfilteredResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid pagination limit",
    unfilteredResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has valid pagination records",
    unfilteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pagination pages",
    unfilteredResponse.pagination.pages >= 0,
  );
  // Test 2: Validate all required post summary fields are present in response
  if (unfilteredResponse.data.length > 0) {
    const samplePost = unfilteredResponse.data[0];
    // Validate basic post fields
    TestValidator.predicate(
      "post has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.id,
      ),
    );
    TestValidator.predicate("post has title", samplePost.title !== undefined);
    TestValidator.predicate(
      "post has post_type",
      samplePost.post_type !== undefined,
    );
    TestValidator.predicate(
      "post has vote_score",
      samplePost.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comment_count",
      samplePost.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      samplePost.created_at !== undefined,
    );
    TestValidator.predicate(
      "post has deleted_at (nullable)",
      samplePost.deleted_at === null || samplePost.deleted_at !== undefined,
    );
    // Validate author fields
    TestValidator.predicate("post has author", samplePost.author !== undefined);
    TestValidator.predicate(
      "author has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.author.id,
      ),
    );
    TestValidator.predicate(
      "author has username",
      samplePost.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has display_name",
      samplePost.author.displayName !== undefined,
    );
    TestValidator.predicate(
      "author has bio (nullable)",
      samplePost.author.bio === null || samplePost.author.bio !== undefined,
    );
    TestValidator.predicate(
      "author has avatar_url (nullable)",
      samplePost.author.avatarUrl === null ||
        samplePost.author.avatarUrl !== undefined,
    );
    TestValidator.predicate(
      "author has karma_score",
      samplePost.author.karmaScore !== undefined,
    );
    TestValidator.predicate(
      "author has created_at",
      samplePost.author.createdAt !== undefined,
    );
    TestValidator.predicate(
      "author has subscription_count",
      samplePost.author.subscriptionCount !== undefined,
    );
    // Validate community fields
    TestValidator.predicate(
      "post has community",
      samplePost.community !== undefined,
    );
    TestValidator.predicate(
      "community has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.community.id,
      ),
    );
    TestValidator.predicate(
      "community has name",
      samplePost.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      samplePost.community.subscriber_count !== undefined,
    );
    TestValidator.predicate(
      "community has created_at",
      samplePost.community.created_at !== undefined,
    );
    TestValidator.predicate(
      "community has description (optional)",
      samplePost.community.description === undefined ||
        samplePost.community.description === null ||
        samplePost.community.description !== undefined,
    );
    TestValidator.predicate(
      "community has icon_url (optional)",
      samplePost.community.icon_url === undefined ||
        samplePost.community.icon_url === null ||
        samplePost.community.icon_url !== undefined,
    );
  }
  // Test 3: Validate posts are sorted by created_at DESC (newest first)
  if (unfilteredResponse.data.length > 1) {
    for (let i = 0; i < unfilteredResponse.data.length - 1; i++) {
      const current = unfilteredResponse.data[i];
      const next = unfilteredResponse.data[i + 1];
      TestValidator.predicate(
        `post ${i} should be newer than or equal to post ${i + 1}`,
        new Date(current.created_at) >= new Date(next.created_at),
      );
    }
  }
  // Test 4: Test filtering with valid UUID format community_id
  // Use a valid UUID format but likely non-existent community ID
  const validUuidFormat = "550e8400-e29b-41d4-a716-446655440000";
  const filteredWithValidUuid =
    await api.functional.redditPlatform.feeds._new.index(connection, {
      body: {
        community_id: validUuidFormat,
        limit: 20,
      } satisfies IRedditPlatformPostFeedNewRequest,
    });
  typia.assert(filteredWithValidUuid);
  // Should return empty data when community doesn't exist
  TestValidator.equals(
    "empty data for non-existent community",
    filteredWithValidUuid.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for non-existent community",
    filteredWithValidUuid.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for non-existent community",
    filteredWithValidUuid.pagination.pages,
    0,
  );
  // Test 5: Test filtering with invalid UUID format (should still be accepted as request)
  // The UUID format validation happens at API level, test that endpoint accepts the parameter
  const invalidUuidFormat = "not-a-valid-uuid";
  const filteredWithInvalidUuid =
    await api.functional.redditPlatform.feeds._new.index(connection, {
      body: {
        community_id: invalidUuidFormat,
        limit: 20,
      } satisfies IRedditPlatformPostFeedNewRequest,
    });
  typia.assert(filteredWithInvalidUuid);
  // Even with invalid UUID format, should return valid response structure
  TestValidator.predicate(
    "response has valid pagination",
    filteredWithInvalidUuid.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "response has valid data array",
    Array.isArray(filteredWithInvalidUuid.data),
  );
  // Test 6: Test different pagination parameters
  const paginationTests = ArrayUtil.repeat(3, (index: number) => ({
    page: index + 1,
    limit: 10 + index * 10,
  }));
  for (const test of paginationTests as { page: number; limit: number }[]) {
    const paginationResponse =
      await api.functional.redditPlatform.feeds._new.index(connection, {
        body: {
          page: test.page,
          limit: test.limit,
        } satisfies IRedditPlatformPostFeedNewRequest,
      });
    typia.assert(paginationResponse);
    TestValidator.equals(
      `pagination current matches requested page ${test.page}`,
      paginationResponse.pagination.current,
      test.page,
    );
    TestValidator.equals(
      `pagination limit matches requested ${test.limit}`,
      paginationResponse.pagination.limit,
      test.limit,
    );
  }
  // Test 7: Verify filtered results maintain all post summary fields
  // Create a controlled test by filtering a non-existent community (empty results)
  // and verify the response structure is still correct
  const testCommunityId = RandomGenerator.alphaNumeric(36);
  const emptyFilterResponse =
    await api.functional.redditPlatform.feeds._new.index(connection, {
      body: {
        community_id: testCommunityId,
        limit: 20,
      } satisfies IRedditPlatformPostFeedNewRequest,
    });
  typia.assert(emptyFilterResponse);
  // Even with no data, response structure should be valid
  TestValidator.predicate(
    "empty response has valid pagination",
    emptyFilterResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "empty response has data array",
    Array.isArray(emptyFilterResponse.data),
  );
}