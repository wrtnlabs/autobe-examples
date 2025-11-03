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
 * Validates post deletion by the creator on the community platform.
 *
 * Steps:
 *
 * 1. Register a new user (creator).
 * 2. Create a community as the creator.
 * 3. Create a text-type post in the community.
 * 4. Delete the post as the creator.
 * 5. Validate that deletion succeeds, and the post is no longer accessible by
 *    postId (further get is not possible since no GET API exposed, but we can
 *    consider the operation successful if no errors occurred).
 * 6. (Authorization check) - only the user who created the post can delete; no API
 *    for admin or other user deletion is provided here, so we skip untestable
 *    parts.
 */
export async function test_api_post_deletion_by_creator(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/landing-page",
  } satisfies ICommunityPlatformUser.IJoin;
  const creator: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(creator);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a text-type post in the community
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    text_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 18,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);
  TestValidator.equals("author id matches user", post.author.id, creator.id);
  TestValidator.equals(
    "community id matches post",
    post.community.id,
    community.id,
  );
  TestValidator.predicate(
    "post text content should exist for text post",
    post.text_content !== null && post.text_content?.body?.length > 0,
  );

  // 4. Delete the post as the creator
  await api.functional.communityPlatform.user.posts.erase(connection, {
    postId: post.id,
  });

  // 5. Try to delete again: should fail (post is already deleted)
  await TestValidator.error("cannot delete already deleted post", async () => {
    await api.functional.communityPlatform.user.posts.erase(connection, {
      postId: post.id,
    });
  });
}
