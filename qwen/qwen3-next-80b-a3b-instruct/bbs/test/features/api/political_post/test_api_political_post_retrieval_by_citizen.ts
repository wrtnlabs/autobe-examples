import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import type { IPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPost";

export async function test_api_political_post_retrieval_by_citizen(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a citizen
  const citizen: IPoliticalForumCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<string>(),
    });
  typia.assert(citizen);

  // Step 2: Create a political forum post
  const postContent: IPoliticalForumPost =
    await api.functional.politicalForum.citizen.posts.create(connection, {
      body: RandomGenerator.content({ paragraphs: 3 }),
    });
  typia.assert(postContent);

  // Step 3: Parse the post content as JSON to extract postId
  // ASSUMPTION: Although IPoliticalForumPost is typed as string, the API returns
  // a JSON string representation of the post object, based on business scenario
  // requirements that specify the returned post must include title, content, status,
  // and moderation state. This is an assumption to enable validation.
  let postObject;
  try {
    postObject = JSON.parse(postContent);
  } catch (e) {
    throw new Error(
      "Post content is not valid JSON as required by business scenario",
    );
  }

  // Validate we have an object with required structure
  if (!postObject || typeof postObject !== "object") {
    throw new Error(
      "Post content is not a valid object as required by business scenario",
    );
  }

  const postId = postObject.id;
  if (!postId || typeof postId !== "string") {
    throw new Error(
      "Post object must contain a string id field as required by business scenario",
    );
  }

  // Step 4: Retrieve the post using the postId
  const retrievedPostContent: IPoliticalForumPost =
    await api.functional.politicalForum.citizen.posts.at(connection, {
      postId: postId,
      body: typia.random<string>(),
    });
  typia.assert(retrievedPostContent);

  // Step 5: Parse the retrieved post content as JSON
  let retrievedPostObject;
  try {
    retrievedPostObject = JSON.parse(retrievedPostContent);
  } catch (e) {
    throw new Error(
      "Retrieved post content is not valid JSON as required by business scenario",
    );
  }

  // Validate we have an object with required structure
  if (!retrievedPostObject || typeof retrievedPostObject !== "object") {
    throw new Error(
      "Retrieved post content is not a valid object as required by business scenario",
    );
  }

  // Step 6: Validate retrieved post matches created post
  TestValidator.equals(
    "retrieved post ID matches created post",
    retrievedPostObject.id,
    postId,
  );

  // Step 7: Validate all expected metadata fields as per scenario
  TestValidator.predicate(
    "retrieved post has title",
    typeof retrievedPostObject.title === "string" &&
      retrievedPostObject.title.length > 0,
  );
  TestValidator.predicate(
    "retrieved post has body",
    typeof retrievedPostObject.body === "string" &&
      retrievedPostObject.body.length > 0,
  );
  TestValidator.predicate(
    "retrieved post has status",
    typeof retrievedPostObject.status === "string" &&
      retrievedPostObject.status.length > 0,
  );
  TestValidator.predicate(
    "retrieved post has moderationState",
    typeof retrievedPostObject.moderationState === "string" &&
      retrievedPostObject.moderationState.length > 0,
  );
  TestValidator.predicate(
    "retrieved post has created_at",
    typeof retrievedPostObject.created_at === "string" &&
      retrievedPostObject.created_at.length > 0,
  );

  // Step 8: Validate ownership using the id field
  TestValidator.equals(
    "retrieved post ID matches citizen ID",
    retrievedPostObject.id,
    citizen.id,
  );
}
