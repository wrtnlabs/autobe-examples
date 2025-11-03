import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

/**
 * Validate that a non-author community member cannot update another member's
 * post.
 *
 * Business rationale:
 *
 * - Posts should be editable only by their author or authorized moderators.
 * - This test creates an author and a community, publishes a post as the author,
 *   then attempts to modify the post while authenticated as a different
 *   member.
 * - The attempt must fail (authorization enforcement). We capture the created
 *   post at creation time and assert that the update attempt throws and that
 *   the original created response remains unchanged.
 *
 * Steps:
 *
 * 1. Author joins (POST /auth/communityMember/join)
 * 2. Author creates community (POST /communityBbs/communityMember/communities)
 * 3. Author creates a post in the community (POST
 *    /communityBbs/communityMember/communities/{communitySlug}/posts)
 * 4. Another member joins (attacker) (POST /auth/communityMember/join)
 * 5. Attacker attempts to update the post (PUT
 *    /communityBbs/communityMember/posts/{postId})
 * 6. Assert that the update attempt throws (authorization failure)
 * 7. Assert that the originally created post object still contains the original
 *    fields
 */
export async function test_api_post_update_by_non_author_forbidden(
  connection: api.IConnection,
) {
  // 1) Author registration
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const author = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: authorEmail,
      username: authorUsername,
      password: "Passw0rd!",
      session_context: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(author);

  // 2) Create community as author
  const communitySlug = `test-community-${Date.now()}`;
  const communityName = `Test Community ${RandomGenerator.alphaNumeric(6)}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a post as the author
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          title: originalTitle,
          body: originalBody,
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // Ensure we captured the original values for later comparison
  TestValidator.equals(
    "created post title is as supplied",
    post.title,
    originalTitle,
  );
  TestValidator.equals(
    "created post body is as supplied",
    post.body,
    originalBody,
  );

  // 4) Attacker (different member) registration
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerUsername = RandomGenerator.alphaNumeric(8);
  const attacker = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: attackerEmail,
      username: attackerUsername,
      password: "Passw0rd!",
      session_context: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(attacker);

  // 5) Attempt update as attacker - must throw (authorization failure)
  await TestValidator.error(
    "non-author cannot update post (authorization enforced)",
    async () => {
      await api.functional.communityBbs.communityMember.posts.update(
        connection,
        {
          postId: post.id,
          body: {
            title: `malicious edit ${RandomGenerator.alphaNumeric(6)}`,
          } satisfies ICommunityBbsPost.IUpdate,
        },
      );
    },
  );

  // 6) Verify that the originally captured post object still contains original values
  // Note: SDK does not provide a GET post endpoint in the provided materials, so
  // re-fetching the post from the server is not possible. We assert that the
  // created response captured earlier contains the original values (indirect
  // verification that the creation returned expected data and that the failed
  // update did not produce a client-side mutation).
  TestValidator.equals(
    "post title unchanged in created response",
    post.title,
    originalTitle,
  );
  TestValidator.equals(
    "post body unchanged in created response",
    post.body,
    originalBody,
  );
}
