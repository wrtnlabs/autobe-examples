import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_post_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Authenticate registered user by joining
  const joinBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "testPassword123",
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(registeredUser);

  // 2. Create a redditCommunity community
  const communityBody = {
    communityName: RandomGenerator.alphabets(8).toLowerCase(),
    displayName: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 15 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create posts with different types

  // 3.1 Text post
  const textPostBody = {
    reddit_community_community_id:
      community.communityName satisfies string as string,
    type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 1 }).slice(0, 100),
    body: RandomGenerator.content({ paragraphs: 2 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const textPost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: textPostBody },
    );
  typia.assert(textPost);
  TestValidator.equals(
    "text post community id exists",
    typeof textPost.reddit_community_community_id === "string",
    true,
  );
  TestValidator.equals("text post type is text", textPost.type, "text");
  TestValidator.predicate(
    "text post has non-null body",
    textPost.body !== null && textPost.body !== undefined,
  );

  // 3.2 Link post
  const linkPostBody = {
    reddit_community_community_id:
      community.communityName satisfies string as string,
    type: "link" as const,
    title: RandomGenerator.paragraph({ sentences: 1 }).slice(0, 100),
    body: null,
    link_url: `https://www.example.com/${RandomGenerator.alphaNumeric(6)}`,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const linkPost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: linkPostBody },
    );
  typia.assert(linkPost);
  TestValidator.equals(
    "link post community id exists",
    typeof linkPost.reddit_community_community_id === "string",
    true,
  );
  TestValidator.equals("link post type is link", linkPost.type, "link");
  TestValidator.predicate(
    "link post has non-null link_url",
    linkPost.link_url !== null && linkPost.link_url !== undefined,
  );

  // 3.3 Image post
  const imagePostBody = {
    reddit_community_community_id:
      community.communityName satisfies string as string,
    type: "image" as const,
    title: RandomGenerator.paragraph({ sentences: 1 }).slice(0, 100),
    body: null,
    link_url: null,
    image_url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
  } satisfies IRedditCommunityPost.ICreate;

  const imagePost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: imagePostBody },
    );
  typia.assert(imagePost);
  TestValidator.equals(
    "image post community id exists",
    typeof imagePost.reddit_community_community_id === "string",
    true,
  );
  TestValidator.equals("image post type is image", imagePost.type, "image");
  TestValidator.predicate(
    "image post has non-null image_url",
    imagePost.image_url !== null && imagePost.image_url !== undefined,
  );

  // 4. Validate ownership linking by verifying user id responses
  TestValidator.equals(
    "text post user id equals",
    textPost.reddit_community_registereduser_id,
    registeredUser.id,
  );
  TestValidator.equals(
    "link post user id equals",
    linkPost.reddit_community_registereduser_id,
    registeredUser.id,
  );
  TestValidator.equals(
    "image post user id equals",
    imagePost.reddit_community_registereduser_id,
    registeredUser.id,
  );
}
