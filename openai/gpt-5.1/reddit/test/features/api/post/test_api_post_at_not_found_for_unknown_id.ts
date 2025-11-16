import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that fetching a post by a non-existent identifier results in a
 * not-found style error rather than returning partial data.
 *
 * Business context:
 *
 * - The community platform exposes GET /communityPlatform/posts/{postId} to
 *   retrieve a detailed representation of a single post.
 * - When a client supplies a postId that does not correspond to any
 *   community_platform_posts record, the service must signal that absence as an
 *   error instead of returning ambiguous or fabricated data.
 * - The test focuses purely on the not-found behavior; it does not depend on any
 *   specific community, visibility level, or post type configuration.
 *
 * Steps executed by this test:
 *
 * 1. Optionally perform a platform admin join call to mimic a realistic
 *    environment where admin features are enabled. The result of this call is
 *    asserted for type safety but not otherwise used.
 * 2. Generate a random UUID string to serve as a postId that is effectively
 *    guaranteed not to exist.
 * 3. Call GET /communityPlatform/posts/{postId} with that UUID and assert that the
 *    operation fails by using TestValidator.error with an async callback. We do
 *    not assert on concrete HTTP status codes or error payload shape; we only
 *    assert that an error is thrown rather than a successful post response.
 * 4. As a defensive guard, invoke the same call once outside of
 *    TestValidator.error; if it unexpectedly succeeds and returns an
 *    ICommunityPlatformPost object, we assert its type and then fail the test
 *    via TestValidator.predicate to highlight that a not-found response was
 *    expected.
 */
export async function test_api_post_at_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Optional environment setup: register a platform admin and assert type
  const adminJoinInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Generate a random UUID for a non-existent postId
  const unknownPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Primary behavior: calling posts.at with an unknown ID should throw
  await TestValidator.error("unknown postId should cause error", async () => {
    await api.functional.communityPlatform.posts.at(connection, {
      postId: unknownPostId,
    });
  });

  // 4. Defensive guard: if for some reason the call succeeds, fail explicitly
  let succeeded = false;
  try {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.posts.at(connection, {
        postId: unknownPostId,
      });
    succeeded = true;
    typia.assert(post);
  } catch {
    // Expected path: error thrown, so we do nothing here
  }

  await TestValidator.predicate(
    "fetching a non-existent postId must not succeed",
    async () => succeeded === false,
  );
}
