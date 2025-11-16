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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostAttachment";

/**
 * Validate the retrieval of post attachments for a community platform post as
 * an authenticated user.
 *
 * Business Context:
 *
 * - Attachments for posts are visible only to authenticated users and only if the
 *   post exists and is accessible (not soft-deleted).
 * - For a freshly created post, there should be no attachments; API must return
 *   an empty data array and correct pagination meta.
 * - Pagination parameters (page, limit) are enforced, defaulting to page 1, limit
 *   20 (unless otherwise specified by the request).
 *
 * Steps:
 *
 * 1. Register and authenticate a new user on the platform, obtaining an authorized
 *    connection.
 * 2. Create a community as this user with proper business-unique name/slug,
 *    visible as public and 'active' status.
 * 3. Submit a new text-type published post in the community, providing both title
 *    and body.
 * 4. Attempt to list attachments (PATCH
 *    /communityPlatform/user/posts/{postId}/attachments) with page 1 and limit
 *    10:
 *
 *    - API must succeed with a result containing empty data, correct page meta, and
 *         no error.
 *    - Validate fields: 'pagination.current', 'pagination.limit',
 *         'pagination.records', 'pagination.pages', and data = []
 * 5. [Soft delete logic skipped: API coverage does not include deletion.]
 */
export async function test_api_post_attachment_listing_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);

  // 2. Create a community as this user
  const createCommunityBody = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);

  // 3. Submit a new text-type published post in the community
  const createPostBody = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 9,
    }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: createPostBody,
    },
  );
  typia.assert(post);

  // 4. List attachments on the post with pagination parameters (page 1, limit 10)
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformPostAttachment.IRequest;
  const pageResult =
    await api.functional.communityPlatform.user.posts.attachments.index(
      connection,
      {
        postId: post.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 5. Validation: Ensure proper empty result and pagination meta
  TestValidator.equals("attachments empty data", pageResult.data, []);
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit applied",
    pageResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is 0",
    pageResult.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", pageResult.pagination.pages, 0);
}
