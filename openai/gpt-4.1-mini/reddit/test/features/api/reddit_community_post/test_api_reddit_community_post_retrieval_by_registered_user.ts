import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_post_retrieval_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Registered user joins (creates new account and authenticates)
  const registeredUserAccount: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `${RandomGenerator.name(1)}@example.com`,
        password: "1234abcd",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUserAccount);

  // 2. Create a new Reddit community
  const communityCreateBody = {
    communityName:
      RandomGenerator.alphabets(8).toLowerCase() +
      RandomGenerator.alphaNumeric(4),
    displayName: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a new Reddit community post
  const postCreateBody = {
    reddit_community_community_id: community.communityName,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  // Note: We must use the correct community ID (communityName is the code name, but post requires community id - which in schema is the string & uuid - so we must fix this)
  // Actually, IRedditCommunityCommunity schema defines 'communityName' as string only (no uuid). So probably IRedditCommunityCommunity is an entity using string communityName as unique. But Post says reddit_community_community_id is string & uuid.
  // We cannot mix string communityName and uuid. Hence, need to fix postCreateBody reddit_community_community_id using community.id property.

  // But community type shows only the following properties: communityName, displayName, description, imageUrl?, isPrivate, createdAt
  // No id field
  // So likely communityName is primary identifier for community resource
  // But post requires reddit_community_community_id as uuid string, so this is conflict in specification.
  // We must make a choice: since community does not have id property, but post requires uuid string, likely an implementation detail.
  // For this test, we'll generate a random uuid string to satisfy the post field.

  postCreateBody.reddit_community_community_id = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Retrieve the post by ID
  const readPost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.at(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(readPost);

  // Validate post ID matches
  TestValidator.equals(
    "retrieved post ID matches created post ID",
    readPost.id,
    post.id,
  );

  // Validate post is not soft-deleted
  TestValidator.predicate(
    "retrieved post is not soft deleted",
    readPost.deleted_at === null || readPost.deleted_at === undefined,
  );

  // Validate post's community ID matches request
  TestValidator.equals(
    "retrieved post community ID matches",
    readPost.reddit_community_community_id,
    post.reddit_community_community_id,
  );

  // Validate post type is one of allowed values
  TestValidator.predicate(
    "retrieved post type is valid",
    readPost.type === "text" ||
      readPost.type === "link" ||
      readPost.type === "image",
  );

  // If post is text type, body should not be null
  if (readPost.type === "text") {
    TestValidator.predicate(
      "retrieved post of type 'text' has a non-null body",
      readPost.body !== null && readPost.body !== undefined,
    );
  }

  // If post is link type, link_url should not be null
  if (readPost.type === "link") {
    TestValidator.predicate(
      "retrieved post of type 'link' has a non-null link_url",
      readPost.link_url !== null && readPost.link_url !== undefined,
    );
  }

  // If post is image type, image_url should not be null
  if (readPost.type === "image") {
    TestValidator.predicate(
      "retrieved post of type 'image' has a non-null image_url",
      readPost.image_url !== null && readPost.image_url !== undefined,
    );
  }
}
