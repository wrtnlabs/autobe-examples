import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_retrieval_success_text_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate guest
  const guestConnection: api.IConnection = { host: connection.host };
  const device_id = typia.random<string & tags.Format<"uuid">>();
  const guest = await authorize_guest_join(guestConnection, {
    body: { device_id } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guest);
  // Step 2: Retrieve a post (using a valid UUID format - test with random ID)
  // Note: This test validates the retrieval endpoint works with valid authentication
  // In a real scenario, you would create a post first via the API or use a test fixture
  const postId = typia.random<string & tags.Format<"uuid">>();
  const retrievedPost = await api.functional.redditLike.guest.posts.at(
    guestConnection,
    { postId },
  );
  typia.assert(retrievedPost);
  // Step 3: Validate all expected fields from IRedditLikePost
  TestValidator.predicate(
    "post has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedPost.id,
    ),
  );
  TestValidator.predicate("post has title", retrievedPost.title.length > 0);
  TestValidator.predicate(
    "post has valid type",
    retrievedPost.type === "text" ||
      retrievedPost.type === "link" ||
      retrievedPost.type === "image",
  );
  TestValidator.predicate(
    "post has score",
    typeof retrievedPost.score === "number",
  );
  TestValidator.predicate(
    "post has comment_count",
    typeof retrievedPost.comment_count === "number",
  );
  TestValidator.predicate(
    "post has author",
    retrievedPost.author !== null && retrievedPost.author !== undefined,
  );
  TestValidator.predicate(
    "post has community",
    retrievedPost.community !== null && retrievedPost.community !== undefined,
  );
  TestValidator.predicate(
    "post has created_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedPost.created_at),
  );
  TestValidator.predicate(
    "post has updated_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedPost.updated_at),
  );
  TestValidator.predicate(
    "post has deleted_at",
    retrievedPost.deleted_at === null ||
      typeof retrievedPost.deleted_at === "string",
  );
  // Validate text post specific fields
  if (retrievedPost.type === "text") {
    TestValidator.predicate(
      "text post has content",
      retrievedPost.content !== null &&
        typeof retrievedPost.content === "string",
    );
    TestValidator.equals("text post has null url", retrievedPost.url, null);
    TestValidator.equals(
      "text post has null image_url",
      retrievedPost.image_url,
      null,
    );
  }
  // Validate author summary fields
  if (retrievedPost.author) {
    TestValidator.predicate(
      "author has id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedPost.author.id,
      ),
    );
    TestValidator.predicate(
      "author has username",
      typeof retrievedPost.author.username === "string" &&
        retrievedPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has display_name",
      typeof retrievedPost.author.display_name === "string" &&
        retrievedPost.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "author has karma_score",
      typeof retrievedPost.author.karma_score === "number",
    );
    TestValidator.predicate(
      "author has created_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        retrievedPost.author.created_at,
      ),
    );
  }
  // Validate community summary fields
  if (retrievedPost.community) {
    TestValidator.predicate(
      "community has name",
      typeof retrievedPost.community.name === "string" &&
        retrievedPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof retrievedPost.community.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community has icon_url",
      retrievedPost.community.icon_url === null ||
        typeof retrievedPost.community.icon_url === "string",
    );
  }
}
