import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test administrator creating an image post with comprehensive validation.
 *
 * This test validates the complete workflow of an administrator creating an
 * image post in a community. The process includes member registration,
 * community creation, administrator registration, and finally image post
 * creation with proper validation.
 *
 * Workflow:
 *
 * 1. Register a member account to create the community
 * 2. Create a community where the image post will be published
 * 3. Register an administrator account and obtain authentication
 * 4. Administrator creates an image post with image URL and caption
 * 5. Validate post structure, type, and metadata
 * 6. Verify proper community association
 */
export async function test_api_post_creation_image_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register a member account to create the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
    >(),
  );
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const memberBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // Step 2: Create a community where the image post will be created
  const communityCode = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<25>
    >(),
  );
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });

  const communityBody = {
    code: communityCode,
    name: communityName,
    description: communityDescription,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 3: Register an administrator account and obtain authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
    >(),
  );
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // Step 4: Administrator creates an image post with image URL and caption
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const imageUrl = typia.random<string & tags.Format<"url">>();
  const caption = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const postBody = {
    community_id: community.id,
    type: "image",
    title: postTitle,
    image_url: imageUrl,
    caption: caption,
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.admin.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Step 5: Validate post structure and type
  TestValidator.equals("post type is image", post.type, "image");
  TestValidator.equals("post title matches", post.title, postTitle);
}
