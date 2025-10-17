import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

/**
 * Validate unauthenticated comment creation is forbidden.
 *
 * Business context:
 *
 * - Only authenticated members may create comments on posts. This test ensures
 *   that attempting to create a comment without a valid authentication token
 *   fails with 401 Unauthorized.
 *
 * Steps:
 *
 * 1. Register a new member (auth/member/join) and obtain authorization (SDK sets
 *    Authorization header on the given connection).
 * 2. Create a community (communityPortal/member/communities) as the member.
 * 3. Create a text post within the community (communityPortal/member/posts).
 * 4. Construct an unauthenticated connection copy and attempt to create a comment
 *    under the previously created post. Assert that the operation returns HTTP
 *    401.
 */
export async function test_api_comment_creation_unauthenticated_fails(
  connection: api.IConnection,
) {
  // 1) Register a member (setup)
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a community as the authenticated member
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(6).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Create a text post in the community as the authenticated member
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4) Attempt to create a comment without authentication
  // Create an unauthenticated connection clone (SDK guidance allows shallow copy)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const commentBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPortalComment.ICreate;

  // The SDK will return an HTTP error for unauthorized requests. Assert 401.
  await TestValidator.httpError(
    "unauthenticated comment creation should return 401",
    401,
    async () => {
      await api.functional.communityPortal.member.posts.comments.create(
        unauthConn,
        {
          postId: post.id,
          body: commentBody,
        },
      );
    },
  );
}
