import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_retrieval_image_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication (required by scenario)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  // 2. Generate random image post data with known values for validation
  const testImagePost: IRedditPlatformPost =
    typia.random<IRedditPlatformPost>();
  typia.assert(testImagePost);
  // Ensure it's an image type post
  if (testImagePost.post_type !== "image") {
    throw new Error(
      "Expected image post type, got: " + testImagePost.post_type,
    );
  }
  // Ensure image content exists for image type post
  if (!testImagePost.image) {
    throw new Error("Expected image content to exist for image post type");
  }
  // 3. Create a test image post via the actual API endpoint
  // Since we don't have member post creation in our API functions,
  // we'll test with a randomly generated post ID and validate the response structure
  // This approach tests the retrieval endpoint with valid data format
  // Simulate retrieving an existing image post by testing response structure
  // In real scenario, the post would exist in the database
  // For E2E testing, we validate that the endpoint returns correct structure for image posts
  // Retrieve the post (in practice, this would be an existing post)
  const retrievedPost: IRedditPlatformPost =
    await api.functional.redditPlatform.guest.posts.at(guestConnection, {
      postId: testImagePost.id,
    });
  typia.assert(retrievedPost);
  // 4. Validate post type is image
  TestValidator.equals("post type is image", retrievedPost.post_type, "image");
  // 5. Validate image content exists and is properly structured
  TestValidator.equals(
    "image field exists",
    retrievedPost.image !== null,
    true,
  );
  if (retrievedPost.image) {
    // Validate image URL is present and valid
    TestValidator.equals(
      "image_url is string",
      typeof retrievedPost.image.image_url,
      "string",
    );
    typia.assert<string & tags.Format<"uri">>(retrievedPost.image.image_url);
    // Validate alt text field exists (can be null)
    TestValidator.equals(
      "image_alt_text type correct",
      typeof retrievedPost.image.image_alt_text,
      typeof testImagePost.image!.image_alt_text,
    );
  }
  // 6. Validate author attribution fields are present
  TestValidator.equals(
    "author id exists",
    retrievedPost.author.id !== undefined,
    true,
  );
  TestValidator.equals(
    "author username is string",
    typeof retrievedPost.author.username,
    "string",
  );
  TestValidator.equals(
    "author karma is number",
    typeof retrievedPost.author.karma,
    "number",
  );
  TestValidator.equals(
    "author created_at is string",
    typeof retrievedPost.author.created_at,
    "string",
  );
  // 7. Validate community attribution fields are present
  TestValidator.equals(
    "community id exists",
    retrievedPost.community.id !== undefined,
    true,
  );
  TestValidator.equals(
    "community name is string",
    typeof retrievedPost.community.name,
    "string",
  );
  TestValidator.equals(
    "community subscriber_count is number",
    typeof retrievedPost.community.subscriber_count,
    "number",
  );
  // 8. Validate engagement metrics are present and reasonable
  TestValidator.predicate(
    "upvotes_count is non-negative",
    retrievedPost.upvotes_count >= 0,
  );
  TestValidator.predicate(
    "downvotes_count is non-negative",
    retrievedPost.downvotes_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is non-negative",
    retrievedPost.comment_count >= 0,
  );
  TestValidator.predicate(
    "score is integer",
    Number.isInteger(retrievedPost.score),
  );
  // 9. Validate timestamps are valid date-time format
  typia.assert<string & tags.Format<"date-time">>(retrievedPost.created_at);
  typia.assert<string & tags.Format<"date-time">>(retrievedPost.updated_at);
  typia.assert<string & tags.Format<"date-time">>(
    retrievedPost.author.created_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    retrievedPost.community.created_at,
  );
  // 10. Validate UUID format for all ID fields
  typia.assert<string & tags.Format<"uuid">>(retrievedPost.id);
  typia.assert<string & tags.Format<"uuid">>(retrievedPost.author.id);
  typia.assert<string & tags.Format<"uuid">>(retrievedPost.community.id);
  // 11. Validate content-specific fields based on post_type
  TestValidator.equals(
    "textContent is null for image post",
    retrievedPost.textContent,
    null,
  );
  TestValidator.equals(
    "linkPost is null for image post",
    retrievedPost.linkPost,
    null,
  );
  TestValidator.predicate(
    "image is non-null for image post",
    retrievedPost.image !== null,
  );
}
