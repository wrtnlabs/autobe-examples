import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Test successful retrieval of a specific attachment associated with an
 * existing post.
 *
 * Workflow:
 *
 * 1. Register (join) a new user.
 * 2. Create a community as that user.
 * 3. Create a published post in that community (type = 'text', status =
 *    'published').
 * 4. Attach a file to the post.
 * 5. Retrieve the attachment by its ID.
 * 6. Validate all returned data matches what was uploaded/created.
 */
export async function test_api_post_attachment_retrieve_for_existing_post(
  connection: api.IConnection,
) {
  // 1. Register (join) a new user and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Create a community as the new user
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 12 }),
    visibility: "public",
    image_url: null,
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a published post in the new community
  const postBody = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Create/attach an attachment to the post
  const attachmentBody = {
    uri:
      "https://cdn.example.com/test-" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
    mimetype: "image/jpeg",
  } satisfies ICommunityPlatformPostAttachment.ICreate;

  const attachment: ICommunityPlatformPostAttachment =
    await api.functional.communityPlatform.user.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 5. Retrieve the attachment by its ID
  const read: ICommunityPlatformPostAttachment =
    await api.functional.communityPlatform.posts.attachments.at(connection, {
      postId: post.id,
      attachmentId: attachment.id,
    });
  typia.assert(read);

  // 6. Validate returned data matches what was uploaded
  TestValidator.equals("attachment id matches", read.id, attachment.id);
  TestValidator.equals("attachment post_id matches", read.post_id, post.id);
  TestValidator.equals("attachment uri matches", read.uri, attachmentBody.uri);
  TestValidator.equals(
    "attachment mimetype matches",
    read.mimetype,
    attachmentBody.mimetype,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof read.created_at === "string" &&
      !Number.isNaN(Date.parse(read.created_at)),
  );
}
