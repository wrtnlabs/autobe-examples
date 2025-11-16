import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that memberUser post creation fails when referencing a non-existent
 * community.
 *
 * Business context:
 *
 * - Posts must belong to an existing community (community_platform_communities).
 * - The backend must reject attempts to create posts whose community_id does not
 *   reference a real community row, even when the author is authenticated and
 *   the post type is valid.
 *
 * Scenario steps:
 *
 * 1. Register a new platformAdmin via /auth/platformAdmin/join to obtain an
 *    authenticated platform admin context.
 * 2. As that platformAdmin, create a valid post type via
 *    /communityPlatform/platformAdmin/postTypes using
 *    ICommunityPlatformPostType.ICreate.
 * 3. Register a new memberUser via /auth/memberUser/join to obtain an
 *    authenticated member user context.
 * 4. As the authenticated memberUser, attempt to create a post via
 *    /communityPlatform/memberUser/posts with:
 *
 *    - Community_id set to a random UUID that should not correspond to any existing
 *         community (no community creation API is invoked in this test).
 *    - Post_type_id set to the id of the previously created post type.
 *    - Title populated with realistic text, and body filled for a text-style post.
 * 5. Assert that the post creation call fails with a client-side HTTP error (4xx,
 *    such as 400 or 404) using TestValidator.httpError and that no
 *    ICommunityPlatformPost is returned.
 */
export async function test_api_post_creation_invalid_community_reference(
  connection: api.IConnection,
) {
  // 1. Register a platformAdmin and authenticate via join
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a valid post type as platformAdmin
  const postTypeBody = {
    code: `text-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert(postType);

  // 3. Register a memberUser via join (this will also authenticate that user)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As authenticated memberUser, attempt to create a post with a non-existent community_id
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  const postCreateBody = {
    community_id: nonExistentCommunityId,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformPost.ICreate;

  // Expect a 4xx client error; accept a small set of typical validation codes
  await TestValidator.httpError(
    "creating a post with non-existent community_id must fail",
    [400, 404, 422],
    async () => {
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postCreateBody,
        },
      );
    },
  );
}
