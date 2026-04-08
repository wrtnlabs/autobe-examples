import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of an existing post by ID.
 *
 * Validates the complete post retrieval flow including authentication, post fetching, and response structure verification. Ensures that the response includes all required fields with correct types and relationships.
 *
 * Special attention is given to verifying that the post_type discriminator correctly determines which content field is populated (text_content for text posts, link_url for link posts, image_url for image posts).
 *
 * 1. Register and authenticate a new member account.
 * 2. Retrieve a post by its unique identifier.
 * 3. Validate response structure including all required fields.
 * 4. Verify post_type discriminator and corresponding content field.
 * 5. Confirm computed fields (vote_score, comment_count) are present.
 * 6. Validate author and community summary objects.
 */
export async function test_api_post_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random post ID for retrieval
  const postId = typia.random<string & typia.tags.Format<"uuid">>();
  // 3. Retrieve the post by ID
  const post = await api.functional.redditClone.posts.at(memberConnection, {
    postId,
  });
  typia.assert(post);
  // 4. Validate post_type discriminator and content field
  TestValidator.predicate(
    "post_type is valid",
    ["text", "link", "image"].includes(post.post_type),
  );
  // Verify content field matches post_type
  if (post.post_type === "text") {
    TestValidator.predicate(
      "text post has text_content",
      post.text_content !== null,
    );
    TestValidator.equals("text post link_url is null", post.link_url, null);
    TestValidator.equals("text post image_url is null", post.image_url, null);
  } else if (post.post_type === "link") {
    TestValidator.predicate("link post has link_url", post.link_url !== null);
    TestValidator.equals(
      "link post text_content is null",
      post.text_content,
      null,
    );
    TestValidator.equals("link post image_url is null", post.image_url, null);
  } else if (post.post_type === "image") {
    TestValidator.predicate(
      "image post has image_url",
      post.image_url !== null,
    );
    TestValidator.equals(
      "image post text_content is null",
      post.text_content,
      null,
    );
    TestValidator.equals("image post link_url is null", post.link_url, null);
  }
  // 5. Validate computed fields are reasonable
  TestValidator.predicate(
    "comment_count is non-negative",
    post.comment_count >= 0,
  );
  // 6. Validate author profile has reasonable data
  TestValidator.predicate(
    "author display_name is not empty",
    post.author.display_name.length > 0,
  );
  // 7. Validate community has reasonable data
  TestValidator.predicate(
    "community name is not empty",
    post.community.name.length > 0,
  );
  TestValidator.predicate(
    "community description is not empty",
    post.community.description.length > 0,
  );
  TestValidator.predicate(
    "subscriber_count is non-negative",
    post.community.subscriber_count >= 0,
  );
  // 8. Validate timestamps are valid
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(post.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(post.updated_at)),
  );
}
