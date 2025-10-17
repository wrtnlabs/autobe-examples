import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

/**
 * Validate that unauthenticated attempts to create a community post are
 * rejected.
 *
 * Business context:
 *
 * - Only authenticated, verified members may create posts in a community.
 * - This test sets up a valid member and community (authenticated calls), then
 *   attempts to create a post using an unauthenticated connection and expects
 *   the API to reject the operation (authentication enforcement).
 *
 * Steps:
 *
 * 1. Register a setup member via POST /auth/member/join
 *    (api.functional.auth.member.join).
 * 2. Create a community via POST /communityPortal/member/communities using the
 *    authenticated connection.
 * 3. Build an unauthenticated connection (empty headers) and attempt to create a
 *    text post via POST /communityPortal/member/posts using that connection.
 * 4. Assert that the unauthenticated post creation fails (TestValidator.error) and
 *    that setup steps succeeded (typia.assert on member and community).
 */
export async function test_api_post_creation_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // 1) Register a setup member (will set connection.headers.Authorization via SDK)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(4)}`;

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a community with the authenticated connection
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Build an unauthenticated connection by clearing headers (do not touch original connection.headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt to create a post without authentication and expect an error
  await TestValidator.error(
    "unauthenticated post creation should be rejected",
    async () => {
      await api.functional.communityPortal.member.posts.create(unauthConn, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          body: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPortalPost.ICreate,
      });
    },
  );

  // 5) Additional sanity checks: ensure setup objects are valid
  typia.assert(community);
  TestValidator.predicate(
    "created community has valid id",
    typeof community.id === "string" && community.id.length > 0,
  );
}
