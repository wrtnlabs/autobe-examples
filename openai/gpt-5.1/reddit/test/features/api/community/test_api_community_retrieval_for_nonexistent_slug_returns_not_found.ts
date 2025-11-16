import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that retrieving a community by a non-existent slug yields a proper
 * not-found style HTTP error and never returns a successful community payload.
 *
 * Business context
 *
 * - The public GET /communityPlatform/communities/{communitySlug} endpoint should
 *   behave predictably when the requested slug does not exist.
 * - Instead of returning a generic 500 or leaking internal details, the backend
 *   must surface a clean not-found style error (typically 404).
 * - This behavior should be independent of whether other communities exist in the
 *   database.
 *
 * Test flow
 *
 * 1. Register a new member user via auth.memberUser.join to establish a valid
 *    authenticated session (used for optional community creation).
 * 2. Optionally create a valid community via
 *    communityPlatform.memberUser.communities.create with a random but
 *    realistic ICommunityPlatformCommunity.ICreate payload. This step mainly
 *    confirms that the not-found behavior does not depend on an empty
 *    database.
 * 3. Define a slug string that is extremely unlikely to collide with any real
 *    community, e.g., a fixed value like "nonexistent-slug-xyz-123" or a
 *    sufficiently long random slug.
 * 4. Invoke api.functional.communityPlatform.communities.at(connection, {
 *    communitySlug }) with that non-existent slug.
 * 5. Use TestValidator.httpError (or TestValidator.error + HttpError checks) to
 *    assert that the call fails with a not-found style HTTP status (404). The
 *    important part is that the call does not succeed and that the exception is
 *    an HttpError with a client-side not-found status, not a server error like
 *    500.
 * 6. Ensure that the branch where a successful ICommunityPlatformCommunity payload
 *    would be received is never executed for the non-existent slug, e.g., by
 *    not placing assertions after the awaited call inside the error
 *    expectation.
 */
export async function test_api_community_retrieval_for_nonexistent_slug_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as a memberUser to satisfy dependencies and enable optional
  //    community creation flows. Although GET /communityPlatform/communities
  //    is public, the scenario requires join to be executed first.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Optionally create a valid community under this memberUser context to
  //    prove that not-found behavior is independent of existing data.
  const existingCommunityBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const existingCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: existingCommunityBody,
      },
    );
  typia.assert(existingCommunity);

  // 3. Prepare a non-existent slug that should not match any real community.
  const nonexistentSlug: string =
    "nonexistent-slug-xyz-123-" + RandomGenerator.alphaNumeric(24);

  // 4 & 5. Invoke the GET endpoint with the non-existent slug and assert that
  //        it fails with a not-found-style HttpError (404).
  await TestValidator.httpError(
    "getting a community with a non-existent slug must return not-found error",
    404,
    async () => {
      // Any success here would cause the validator to fail, so we do not add
      // further assertions after the call in this closure.
      const result = await api.functional.communityPlatform.communities.at(
        connection,
        {
          communitySlug: nonexistentSlug,
        },
      );
      // If, for some reason, this succeeds, assert to keep type safety and
      // make it obvious in debugging.
      typia.assert(result);
    },
  );

  // 6. Additionally, sanity-check that calling the endpoint with the existing
  //    community slug still works and returns a valid payload, confirming that
  //    only the non-existent slug path fails.
  const loadedExisting: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communitySlug: existingCommunity.slug,
    });
  typia.assert(loadedExisting);
  TestValidator.equals(
    "loading an existing community by slug should succeed and match slug",
    loadedExisting.slug,
    existingCommunity.slug,
  );
}
