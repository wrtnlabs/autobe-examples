import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Validate duplicate-name conflict on community creation for member users.
 *
 * Steps:
 *
 * 1. Register a fresh member user via join and gain authenticated context.
 * 2. Create a community using a unique handle (name); validate response fields.
 * 3. Attempt to create another community with the same handle; expect error.
 * 4. Create a different community with another unique handle to confirm service
 *    remains functional.
 *
 * Notes:
 *
 * - Do not assert specific HTTP status codes; only assert that an error occurs
 *   for duplicate name.
 * - All responses are verified with typia.assert to guarantee type correctness.
 */
export async function test_api_community_creation_duplicate_name_conflict(
  connection: api.IConnection,
) {
  // 1) Register member user (authentication)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(12); // matches pattern ^[A-Za-z0-9_]{3,20}$
  const password: string = `A1${RandomGenerator.alphaNumeric(8)}!`; // >=8 chars, has letter and digit

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Create a community with a unique name
  const VISIBILITIES = [
    "public",
    "restricted",
    "private",
  ] as const satisfies readonly IECommunityVisibility[];
  const visibility: IECommunityVisibility = RandomGenerator.pick(VISIBILITIES);

  const uniqueName1 = `r_${RandomGenerator.alphaNumeric(12)}`;
  const createBody1 = {
    name: uniqueName1,
    display_name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility,
    nsfw: RandomGenerator.pick([true, false] as const),
    auto_archive_days: 30, // minimum per DTO constraint
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: createBody1 },
    );
  typia.assert(community1);

  // Business value checks (actual-first order)
  TestValidator.equals(
    "created community name matches input",
    community1.name,
    createBody1.name,
  );
  TestValidator.equals(
    "created community visibility matches input",
    community1.visibility,
    createBody1.visibility,
  );
  TestValidator.equals(
    "created community nsfw matches input",
    community1.nsfw,
    createBody1.nsfw,
  );
  TestValidator.equals(
    "created community auto_archive_days matches input",
    community1.auto_archive_days,
    createBody1.auto_archive_days,
  );

  // 3) Attempt duplicate name creation, expecting an error (conflict-style)
  const duplicateBody = {
    name: createBody1.name, // exact same name triggers uniqueness rule
    display_name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: RandomGenerator.pick(VISIBILITIES),
    nsfw: RandomGenerator.pick([true, false] as const),
    auto_archive_days: 30,
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;

  await TestValidator.error(
    "duplicate community name should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: duplicateBody },
      );
    },
  );

  // 4) Sanity: creating another unique community should still succeed
  const uniqueName2 = `r_${RandomGenerator.alphaNumeric(12)}`;
  const createBody2 = {
    name: uniqueName2,
    display_name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: RandomGenerator.pick(VISIBILITIES),
    nsfw: false,
    auto_archive_days: 30,
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: createBody2 },
    );
  typia.assert(community2);
  TestValidator.equals(
    "second community name matches input",
    community2.name,
    createBody2.name,
  );
}
