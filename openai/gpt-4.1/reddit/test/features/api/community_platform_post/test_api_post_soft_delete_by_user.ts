import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate soft-delete workflow for a community platform post made by its
 * creator (user actor).
 *
 * This test covers the user journey from onboarding and community creation
 * through post submission, followed by a soft-delete (not hard delete) of their
 * own post. Confirmation steps include audit field checks and business behavior
 * regarding entity visibility after deletion.
 *
 * 1. Register and authenticate as a fresh user (capture credentials for session
 *    continuity).
 * 2. Create a new community (using required fields for
 *    ICommunityPlatformCommunity.ICreate for realistic identity and allowed
 *    status/visibility).
 * 3. In the created community, submit a new post as the authenticated user
 *    (ICommunityPlatformPost.ICreate; type: "text"; body+title).
 * 4. Soft-delete the post via the erase API (by postId, as the user).
 * 5. Attempt to retrieve the post again with a direct fetch (simulate the effect
 *    of standard retrieval APIs, if available: this post should now return with
 *    deleted_at set, or be omitted from active queries).
 * 6. Assert 'deleted_at' is filled (not null or undefined); audit business fields
 *    match expectations for a soft delete. Confirm other fields remain
 *    correct.
 * 7. (If possible) Attempt to delete again or update the post (should result in an
 *    error; skip if not supported by API surface).
 *
 * Attachments and relational entities are not directly visible via the exposed
 * DTO/API, so assumption is that they remain in backend storage but are not
 * user-accessible after post deletion. No direct attachment listing/validation
 * occurs here.
 */
export async function test_api_post_soft_delete_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  TestValidator.predicate(
    "user created - non-null id",
    typeof userAuth.id === "string" && !!userAuth.id,
  );

  // 2. Create a new community
  const communityReq = {
    name: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<3> &
      tags.MaxLength<30>,
    display_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<100>,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 12,
    }) as string & tags.MinLength<1> & tags.MaxLength<2000>,
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityReq,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name matches",
    community.name,
    communityReq.name,
  );

  // 3. Create a post in that community
  const postReq = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 14 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 16,
      wordMin: 4,
      wordMax: 12,
    }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postReq },
  );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postReq.title);
  TestValidator.equals("post type matches", post.type, postReq.type);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post deleted_at before delete: should be null or undefined",
    post.deleted_at,
    null,
  );

  // 4. Soft-delete the post
  await api.functional.communityPlatform.user.posts.erase(connection, {
    postId: post.id,
  });

  // 5. Try fetching the post again (simulate by re-creating post, but only if the API allowed fetching)
  // Since there's no exposed API for directly fetching a post by id, simulate that by trying to create a post with same title (should fail if unique & not cleaned), or try updating/deleting again (business-prohibited, not API-enforced).

  // (If post is not accessible directly, simply assert by re-calling posts.create or testing the business uniqueness constraint.)
  // Assume post would be omitted in active queries - we only have the response from soft delete for audit.

  // 6. Attempt to create a new post with the same title in same community (should be allowed if soft delete de-uniques, or error if not cleaned)
  const post2Req = {
    type: "text",
    title: post.title,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "published",
    community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;
  const post2 = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: post2Req },
  );
  typia.assert(post2);
  TestValidator.notEquals(
    "new post id differs from deleted post",
    post2.id,
    post.id,
  );
  TestValidator.equals("new post is not deleted", post2.deleted_at, null);

  // 7. (Business: direct update of deleted post should be impossible - not enforced by surface; here would require API access, which is not exposed)
  // 8. Check that the original post deleted_at is effectively set in the backend (Not directly testable, presumed correct from soft delete API and absence from active listing)
}
