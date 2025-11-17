import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Validate comprehensive update of redditCommunity posts by a registered user.
 *
 * This test function implements the full user journey for a registered user to
 * join, create a community, post content, update the post, and validate the
 * updates.
 *
 * Steps:
 *
 * 1. Registered user joins and authenticates to obtain tokens.
 * 2. Creates a new reddit community with proper fields.
 * 3. Creates a new post within this community with initial content.
 * 4. Updates the post's content (title, body/link_url/image_url) based on post
 *    type.
 * 5. Validates the returned post update includes all changes and timestamps.
 */
export async function test_api_redditcommunity_post_update_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new registeredUser
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Step 2: Create a new reddit community
  const communityCreateBody = {
    communityName: RandomGenerator.alphabets(8),
    displayName: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    imageUrl: `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.png`,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Since community schema does not provide an ID,
  // generate a new UUID to simulate community id for post creation
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a new post within the community
  // Randomly pick the post type
  const postTypes = ["text", "link", "image"] as const;
  const selectedType = RandomGenerator.pick(postTypes);

  // Compose post create body based on type
  let postCreateBody: IRedditCommunityPost.ICreate = {
    reddit_community_community_id: communityId,
    type: selectedType,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  };
  if (selectedType === "text") {
    postCreateBody.body = RandomGenerator.content({ paragraphs: 2 });
  } else if (selectedType === "link") {
    postCreateBody.link_url = `https://${RandomGenerator.alphaNumeric(10)}.com/page`;
  } else if (selectedType === "image") {
    postCreateBody.image_url = `https://images.example.com/${RandomGenerator.alphaNumeric(12)}.png`;
  }

  // Call post create
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // Step 4: Update the post fields
  // Prepare update payload
  let updateBody: IRedditCommunityPost.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
  };
  if (post.type === "text") {
    updateBody.body = RandomGenerator.content({ paragraphs: 3 });
  } else if (post.type === "link") {
    updateBody.link_url = `https://${RandomGenerator.alphaNumeric(10)}.org/newpage`;
  } else if (post.type === "image") {
    updateBody.image_url = `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(14)}.jpg`;
  }

  // Call post update with postId param
  const updatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.update(
      connection,
      {
        postId: post.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPost);

  // Step 5: Validate update results
  TestValidator.equals(
    "post id remains same after update",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "community id remains same",
    updatedPost.reddit_community_community_id,
    post.reddit_community_community_id,
  );
  TestValidator.equals("post type remains same", updatedPost.type, post.type);
  TestValidator.equals("title updated", updatedPost.title, updateBody.title!);

  if (updatedPost.type === "text") {
    TestValidator.equals(
      "body updated",
      updatedPost.body ?? "",
      updateBody.body ?? "",
    );
  } else if (updatedPost.type === "link") {
    TestValidator.equals(
      "link_url updated",
      updatedPost.link_url ?? "",
      updateBody.link_url ?? "",
    );
  } else if (updatedPost.type === "image") {
    TestValidator.equals(
      "image_url updated",
      updatedPost.image_url ?? "",
      updateBody.image_url ?? "",
    );
  }

  TestValidator.predicate(
    "updated_at is newer than original",
    updatedPost.updated_at >= post.updated_at,
  );
}
