import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Validate community creation rejects invalid values while honoring allowed
 * visibility set.
 *
 * Background and constraints:
 *
 * - Visibility is strictly typed as IECommunityVisibility ("public" |
 *   "restricted" | "private"). Therefore, attempting to send an invalid
 *   visibility like "hidden" is a compile-time error and MUST NOT be tested by
 *   breaking type safety.
 *
 * Test flow (type-safe rewrite for invalid case):
 *
 * 1. Join as a member user to obtain an authenticated session.
 * 2. Attempt to create a community with auto_archive_days < 30 (business rule
 *    violation) and expect an error. This validates server-side input
 *    constraints without violating types.
 * 3. Create a community with the SAME name but valid fields to confirm no record
 *    was created by the failed attempt (name uniqueness guarantees this
 *    check).
 * 4. Additionally, create one community for each allowed visibility value (public,
 *    restricted, private) to ensure the allowed set is accepted.
 */
export async function test_api_community_creation_invalid_visibility(
  connection: api.IConnection,
) {
  // 1) Join as member user (SDK handles Authorization header automatically)
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: "Passw0rd1!", // 8+ chars, includes letters and digits
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Invalid creation attempt: auto_archive_days must be >= 30
  const invalidName = `comm-${RandomGenerator.alphaNumeric(12)}`;
  await TestValidator.error(
    "community creation rejects auto_archive_days < 30",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: {
            name: invalidName,
            display_name: null,
            description: null,
            visibility: "public",
            nsfw: false,
            auto_archive_days: 7,
            language: null,
            region: null,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // 3) Create with the same name but valid fields — proves no record was created earlier
  const created =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: invalidName,
          display_name: null,
          description: null,
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          language: null,
          region: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "valid creation after failed attempt should keep the requested name",
    created.name,
    invalidName,
  );

  // 4) Create communities for each allowed visibility to ensure acceptance
  const visibilities = ["public", "restricted", "private"] as const;
  for (const vis of visibilities) {
    const out =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: {
            name: `comm-${vis}-${RandomGenerator.alphaNumeric(8)}`,
            display_name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            visibility: vis,
            nsfw: false,
            auto_archive_days: 30,
            language: "en",
            region: "US",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(out);
    TestValidator.equals(
      `created community has requested visibility: ${vis}`,
      out.visibility,
      vis,
    );
  }
}
