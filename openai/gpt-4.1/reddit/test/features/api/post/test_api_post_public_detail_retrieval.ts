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
 * Validate public retrieval of a full post detail.
 *
 * Steps:
 *
 * 1. Register a new user (auth / user / join)
 * 2. Create a new community (communityPlatform / user / communities)
 * 3. Create a new text post in this community (communityPlatform / user / posts)
 * 4. Retrieve the created post as public and verify all fields and associations
 * 5. Attempt to fetch a non-existent post and expect an error
 * 6. (Optional: if possible) Soft-delete the post and check retrieval result (not
 *    implemented here as no delete endpoint is provided)
 */
export async function test_api_post_public_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Create new community
  const communityBody = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 16,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a text post in that community
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 8, wordMax: 18 }),
    text_body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community association",
    post.community.id,
    community.id,
  );
  TestValidator.equals("post author association", post.author.id, user.id);
  TestValidator.predicate(
    "post status is published or visible",
    typeof post.status === "string" && post.status.length > 0,
  );
  TestValidator.equals(
    "text content matches",
    post.text_content?.body,
    postBody.text_body,
  );
  TestValidator.equals(
    "link content is not present for text post",
    post.link_content,
    null,
  );
  TestValidator.equals(
    "image contents empty for text post",
    post.image_contents.length,
    0,
  );

  // 4. Retrieve the created post as public (no auth or as same user)
  const fetched = await api.functional.communityPlatform.posts.at(connection, {
    postId: post.id,
  });
  typia.assert(fetched);
  TestValidator.equals("fetched post id", fetched.id, post.id);
  TestValidator.equals("fetched title", fetched.title, postBody.title);
  TestValidator.equals(
    "fetched community id",
    fetched.community.id,
    community.id,
  );
  TestValidator.equals("fetched author id", fetched.author.id, user.id);
  TestValidator.equals(
    "fetched text content",
    fetched.text_content?.body,
    postBody.text_body,
  );
  TestValidator.equals(
    "link content is not present for text post",
    fetched.link_content,
    null,
  );
  TestValidator.equals(
    "image contents empty for text post",
    fetched.image_contents.length,
    0,
  );

  // 5. Try to fetch a non-existent post and expect an error
  await TestValidator.error(
    "fetching non-existent post should fail",
    async () => {
      await api.functional.communityPlatform.posts.at(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
