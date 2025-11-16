import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify behavior when creating community rules for a non-existent community
 * slug.
 *
 * Business goal
 *
 * - Ensure the rules creation endpoint enforces community existence by slug
 *   before inserting a rules document, and correctly rejects requests targeting
 *   unknown communities.
 * - Prevents creation of orphan rules records that are not attached to any real
 *   community.
 *
 * Test flow
 *
 * 1. Register and implicitly authenticate a `memberUser` via POST
 *    /auth/memberUser/join, using a valid ICommunityPlatformMemberuser.IJoin
 *    payload. The SDK will automatically attach the returned token to the
 *    connection, so subsequent memberUser calls are authenticated.
 * 2. Choose a slug string that is extremely unlikely to exist and do not create
 *    any community with that slug (no community creation API is available in
 *    this test scope, so any slug is effectively "unknown").
 * 3. Prepare a syntactically valid rules creation payload using
 *    ICommunityPlatformCommunityRule.ICreate: title, body, version, and
 *    is_active.
 * 4. Call api.functional.communityPlatform.memberUser.communities.rules.create
 *    with the invalid communitySlug and the valid body, and assert with
 *    TestValidator.httpError that the call results in an HTTP 4xx error (for
 *    example 404 Not Found or 400/403 depending on implementation).
 *
 * Notes
 *
 * - Because no community creation or listing endpoint is available in this SDK
 *   slice, the test cannot directly verify database-side absence of rules.
 *   Instead, it validates that the creation attempt itself fails with a client
 *   error status, which is the observable contract that protects against orphan
 *   rules.
 */
export async function test_api_community_rules_creation_for_invalid_community_slug(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2. Pick an obviously non-existent community slug
  const invalidCommunitySlug = `non-existent-slug-${RandomGenerator.alphaNumeric(16)}`;

  // 3. Build a syntactically valid rules creation payload
  const rulesCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  // 4. Expect an HTTP client error when trying to create rules for the
  //    non-existent community slug.
  await TestValidator.httpError(
    "creating rules for non-existent community slug must fail",
    [400, 403, 404],
    async () => {
      await api.functional.communityPlatform.memberUser.communities.rules.create(
        connection,
        {
          communitySlug: invalidCommunitySlug,
          body: rulesCreateBody,
        },
      );
    },
  );
}
