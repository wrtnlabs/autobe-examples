import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate retrieval of full text content from a text post as its creator.
 *
 * 1. Register & authenticate a new user.
 * 2. Create a community as that user.
 * 3. Create a text-type post in that community.
 * 4. Retrieve the post's full text using the get endpoint for post text content.
 * 5. Assert the retrieved text body matches the originally posted content and is
 *    accessible to the post creator (current user).
 */
export async function test_api_post_text_retrieval_by_creator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test.community/join",
    referrer: "https://test.community/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userRegistration,
    });
  typia.assert(user);

  // 2. Create a new community as the user
  const communityPayload = {
    name: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityPayload,
    });
  typia.assert(community);

  // 3. Create a new text-type post in the community
  const TEXT_BODY = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 12,
  });
  const postCreatePayload = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    text_body: TEXT_BODY,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postCreatePayload,
    });
  typia.assert(post);
  TestValidator.equals(
    "post.text_content.body matches original",
    post.text_content?.body,
    TEXT_BODY,
  );

  // 4. Retrieve the post's full markdown/text content using the endpoint
  const retrievedTextContent: ICommunityPlatformPostTexts =
    await api.functional.communityPlatform.user.posts.text.at(connection, {
      postId: post.id,
    });
  typia.assert(retrievedTextContent);

  // 5. Validate that the returned content matches the original post's text_body
  TestValidator.equals(
    "retrieved post text body matches posted content",
    retrievedTextContent.body,
    TEXT_BODY,
  );
}
