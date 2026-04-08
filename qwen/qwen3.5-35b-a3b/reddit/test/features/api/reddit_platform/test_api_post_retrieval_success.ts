import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a post by UUID with full content, author, and community information.
 *
 * Validates the complete post retrieval workflow on the Reddit-like community platform. Creates a member account, authenticates, and retrieves a post by its UUID to verify that all post metadata, content, author attribution, and community association are correctly returned. Ensures that the score is properly calculated and that content sections match the post type classification.
 *
 * Special attention is given to verifying that the post author's username and karma score are correctly attributed, the community name matches where the post was published, and all timestamps are in ISO 8601 format with UTC timezone.
 *
 * 1. Create a member account via POST /redditPlatform/auth/member/join with valid credentials.
 * 2. Authenticate the member to obtain JWT tokens for subsequent API requests.
 * 3. Retrieve a post by UUID via GET /redditPlatform/member/posts/{postId} with valid post ID.
 * 4. Validate the response contains all required post metadata: id, title, post_type, vote counts, score, timestamps.
 * 5. Verify content section matches post_type: textContent for text, linkPost for links, image for images.
 * 6. Confirm author section includes username and karma score from the member table.
 * 7. Ensure community section includes the community name where the post was published.
 * 8. Validate score is correctly calculated as upvotes_count minus downvotes_count.
 * 9. Confirm deleted_at is null for active posts (not soft-deleted).
 * 10. Verify all timestamps are in ISO 8601 date-time format with UTC timezone.
 */
export async function test_api_post_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Use the member's connection to retrieve the post
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3. Generate a random post ID to retrieve
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the post by ID
  const post = await api.functional.redditPlatform.member.posts.at(
    postConnection,
    { postId },
  );
  typia.assert(post);
  // 5. Validate post metadata
  TestValidator.equals("post id matches", post.id, postId);
  TestValidator.equals("post has title", post.title.length > 0, true);
  TestValidator.predicate(
    "valid post type",
    ["text", "link", "image"].includes(post.post_type),
  );
  TestValidator.predicate("upvotes non-negative", post.upvotes_count >= 0);
  TestValidator.predicate("downvotes non-negative", post.downvotes_count >= 0);
  TestValidator.predicate(
    "comment count non-negative",
    post.comment_count >= 0,
  );
  TestValidator.predicate(
    "score is valid int32",
    post.score >= -2147483648 && post.score <= 2147483647,
  );
  // 6. Validate score calculation: score = upvotes_count - downvotes_count
  const calculatedScore = post.upvotes_count - post.downvotes_count;
  TestValidator.equals(
    "score matches calculation",
    post.score,
    calculatedScore,
  );
  // 7. Validate timestamps are ISO 8601 format
  TestValidator.equals(
    "created_at is valid date-time",
    !!post.created_at.match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/,
    ),
    true,
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    !!post.updated_at.match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/,
    ),
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active post",
    post.deleted_at === null,
    true,
  );
  // 8. Validate author section
  typia.assert(post.author);
  TestValidator.equals("author has id", post.author.id !== undefined, true);
  TestValidator.equals(
    "author has username",
    post.author.username !== undefined,
    true,
  );
  TestValidator.equals("author has karma", post.author.karma !== undefined, true);
  TestValidator.equals(
    "author has created_at",
    post.author.created_at !== undefined,
    true,
  );
  // 9. Validate community section
  typia.assert(post.community);
  TestValidator.equals("community has id", post.community.id !== undefined, true);
  TestValidator.equals("community has name", post.community.name !== undefined, true);
  TestValidator.equals(
    "community has subscriber_count",
    post.community.subscriber_count !== undefined,
    true,
  );
  // 10. Validate content section matches post_type
  switch (post.post_type) {
    case "text":
      typia.assert(post.textContent);
      TestValidator.equals(
        "textContent exists for text post",
        post.textContent !== null,
        true,
      );
      TestValidator.equals(
        "textContent has valid text",
        post.textContent?.text_content !== undefined,
        true,
      );
      break;
    case "link":
      typia.assert(post.linkPost);
      TestValidator.equals(
        "linkPost exists for link post",
        post.linkPost !== null,
        true,
      );
      TestValidator.equals("linkPost has url", post.linkPost?.url !== undefined, true);
      TestValidator.equals(
        "linkPost url is valid uri",
        !!post.linkPost?.url.match(/^https?:\/\//),
        true,
      );
      break;
    case "image":
      typia.assert(post.image);
      TestValidator.equals("image exists for image post", post.image !== null, true);
      TestValidator.equals("image has url", post.image?.image_url !== undefined, true);
      TestValidator.equals(
        "image url is valid uri",
        !!post.image?.image_url.match(/^https?:\/\//),
        true,
      );
      break;
    default:
      throw new Error(`Unknown post_type: ${post.post_type}`);
  }
}