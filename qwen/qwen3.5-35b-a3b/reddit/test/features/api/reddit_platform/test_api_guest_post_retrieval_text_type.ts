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

/**
 * Test guest retrieval of a text-type post with full content access.
 *
 * Validates that guest users can successfully retrieve text posts through the
 * guest API endpoint, with complete content, author attribution, and community
 * information included in the response. Ensures proper authentication flow
 * and data integrity across post retrieval.
 *
 * 1. Guest session creation with device fingerprint authentication
 * 2. Text post retrieval with full entity structure
 * 3. Validation of all post fields including text_content, author, community
 * 4. Verification of engagement metrics and timestamps
 */
export async function test_api_guest_post_retrieval_text_type(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditPlatformGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // Generate a test post ID (in simulation mode, this will return mock data)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the post as guest
  const post = await api.functional.redditPlatform.guest.posts.at(
    guestConnection,
    {
      postId,
    },
  );
  typia.assert(post);
  // Validate post type is text
  TestValidator.equals("post type", post.post_type, "text");
  // Validate text content is accessible and non-null
  TestValidator.notEquals("text content exists", post.textContent, null);
  if (post.textContent) {
    TestValidator.equals(
      "text content is string",
      typeof post.textContent!.text_content,
      "string",
    );
  }
  // Validate author attribution is properly joined
  TestValidator.notEquals("author exists", post.author, null);
  TestValidator.equals(
    "author has username",
    typeof post.author!.username,
    "string",
  );
  TestValidator.equals("author has karma", typeof post.author!.karma, "number");
  // Validate community attribution is properly joined
  TestValidator.notEquals("community exists", post.community, null);
  TestValidator.equals(
    "community has name",
    typeof post.community!.name,
    "string",
  );
  TestValidator.equals(
    "community has subscriber count",
    typeof post.community!.subscriber_count,
    "number",
  );
  // Validate score calculation business logic (upvotes - downvotes)
  const calculatedScore = post.upvotes_count - post.downvotes_count;
  TestValidator.equals("score calculation", post.score, calculatedScore);
  // Validate engagement metrics are non-negative
  TestValidator.predicate("upvotes non-negative", post.upvotes_count >= 0);
  TestValidator.predicate("downvotes non-negative", post.downvotes_count >= 0);
  TestValidator.predicate(
    "comment count non-negative",
    post.comment_count >= 0,
  );
  // Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid",
    new Date(post.created_at).toISOString() === post.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(post.updated_at).toISOString() === post.updated_at,
  );
  // Validate post is not soft-deleted (accessible to guests)
  TestValidator.equals("post not deleted", post.deleted_at, null);
}
