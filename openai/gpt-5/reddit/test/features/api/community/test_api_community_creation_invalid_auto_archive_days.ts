import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Validate business rule for community creation: auto_archive_days must be >=
 * 30.
 *
 * Steps:
 *
 * 1. Register and authenticate a member user via POST /auth/memberUser/join.
 * 2. Attempt to create a community with auto_archive_days = 29 (< 30) and expect
 *    an error.
 * 3. Create the same community name again with auto_archive_days = 30 and expect
 *    success.
 * 4. Validate the created community's name and auto_archive_days.
 */
export async function test_api_community_creation_invalid_auto_archive_days(
  connection: api.IConnection,
) {
  // 1) Member user join (authentication)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `user_${RandomGenerator.alphaNumeric(10)}`; // 3-20 chars, alnum + underscore
  const password: string = `A1${RandomGenerator.alphaNumeric(8)}`; // ensure letter+digit, length >= 10
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Shared community name to verify non-persistence on invalid attempt
  const communityName: string = `e2e_${RandomGenerator.alphaNumeric(12)}`;

  // 2) Invalid create attempt (auto_archive_days < 30)
  const invalidCreateBody = {
    name: communityName,
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph(),
    visibility: "public",
    nsfw: false,
    auto_archive_days: 29, // invalid: must be >= 30
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;

  await TestValidator.error(
    "creating community with auto_archive_days < 30 must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: invalidCreateBody },
      );
    },
  );

  // 3) Valid create attempt with the same name (proves invalid one did not persist)
  const validCreateBody = {
    name: communityName,
    display_name: invalidCreateBody.display_name,
    description: invalidCreateBody.description,
    visibility: invalidCreateBody.visibility,
    nsfw: invalidCreateBody.nsfw,
    auto_archive_days: 30,
    language: invalidCreateBody.language,
    region: invalidCreateBody.region,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const created =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: validCreateBody },
    );
  typia.assert(created);

  // 4) Business validations
  TestValidator.equals(
    "created community name matches input",
    created.name,
    validCreateBody.name,
  );
  TestValidator.equals(
    "created auto_archive_days equals 30",
    created.auto_archive_days,
    30,
  );
}
