import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

/**
 * Member self profile creation/update flow with authentication boundary and
 * timestamp monotonicity.
 *
 * Purpose
 *
 * - Ensure a newly joined member can set up their own profile using the self
 *   endpoint.
 * - Validate authentication boundary (unauthenticated call must fail).
 * - Confirm that the first update creates missing extended profile data and
 *   returns a consolidated view.
 * - Verify timestamps are ISO strings and monotonic, and that a second update
 *   overwrites fields and advances updatedAt.
 *
 * Steps
 *
 * 1. Try PUT /econDiscuss/member/me/profile without Authorization using a cloned
 *    connection with empty headers → expect error.
 * 2. Join as a new Member via /auth/member/join.
 * 3. First PUT update including displayName, avatarUri, timezone="Asia/Seoul",
 *    locale="en-US", bio/affiliation/website/location.
 *
 *    - Assert owner id matches authenticated principal id.
 *    - Assert fields reflect the payload.
 *    - Assert updatedAt >= createdAt.
 * 4. Second PUT update changing several fields (keep timezone/locale same), verify
 *    fields updated and updatedAt increased.
 */
export async function test_api_user_profile_update_self_create_missing_profile(
  connection: api.IConnection,
) {
  // 1) Authentication boundary: unauthenticated must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthUpdateBody = {
    displayName: RandomGenerator.name(1),
  } satisfies IEconDiscussUserProfile.IUpdate;
  await TestValidator.error(
    "unauthenticated cannot update self profile",
    async () => {
      await api.functional.econDiscuss.member.me.profile.update(unauthConn, {
        body: unauthUpdateBody,
      });
    },
  );

  // 2) Join as a new Member (SDK attaches Authorization header automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 3) First profile update – create missing extended profile and persist fields
  const updateBody1 = {
    displayName: RandomGenerator.name(),
    avatarUri: typia.random<string & tags.Format<"uri">>(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    bio: RandomGenerator.paragraph({ sentences: 8 }),
    affiliation: RandomGenerator.paragraph({ sentences: 2 }),
    website: typia.random<string & tags.Format<"uri">>(),
    location: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconDiscussUserProfile.IUpdate;
  const profile1 = await api.functional.econDiscuss.member.me.profile.update(
    connection,
    { body: updateBody1 },
  );
  typia.assert(profile1);

  // Ownership and field reflection
  TestValidator.equals(
    "owner id matches authenticated principal",
    profile1.id,
    authorized.id,
  );
  // displayName is required in response; ensure expected is non-null string
  const expectedDisplayName1 = typia.assert<string>(updateBody1.displayName!);
  TestValidator.equals(
    "displayName applied on first update",
    profile1.displayName,
    expectedDisplayName1,
  );
  TestValidator.equals(
    "avatarUri applied on first update",
    profile1.avatarUri,
    updateBody1.avatarUri,
  );
  TestValidator.equals(
    "timezone applied Asia/Seoul",
    profile1.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals("locale applied en-US", profile1.locale, "en-US");
  TestValidator.equals(
    "bio applied on first update",
    profile1.bio,
    updateBody1.bio,
  );
  TestValidator.equals(
    "affiliation applied on first update",
    profile1.affiliation,
    updateBody1.affiliation,
  );
  TestValidator.equals(
    "website applied on first update",
    profile1.website,
    updateBody1.website,
  );
  TestValidator.equals(
    "location applied on first update",
    profile1.location,
    updateBody1.location,
  );

  // Timestamp monotonicity
  const createdAt1 = new Date(profile1.createdAt).getTime();
  const updatedAt1 = new Date(profile1.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt should be same or after createdAt on first update",
    updatedAt1 >= createdAt1,
  );

  // 4) Second profile update – change several fields and ensure updatedAt increases
  const updateBody2 = {
    displayName: RandomGenerator.name(),
    avatarUri: typia.random<string & tags.Format<"uri">>(),
    // keep timezone and locale same to validate persistence of those settings
    timezone: "Asia/Seoul",
    locale: "en-US",
    bio: RandomGenerator.paragraph({ sentences: 6 }),
    affiliation: RandomGenerator.paragraph({ sentences: 3 }),
    website: typia.random<string & tags.Format<"uri">>(),
    location: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IEconDiscussUserProfile.IUpdate;
  const profile2 = await api.functional.econDiscuss.member.me.profile.update(
    connection,
    { body: updateBody2 },
  );
  typia.assert(profile2);

  // Ownership remains
  TestValidator.equals(
    "owner id must remain same after second update",
    profile2.id,
    authorized.id,
  );
  // Field reflections for second update
  const expectedDisplayName2 = typia.assert<string>(updateBody2.displayName!);
  TestValidator.equals(
    "displayName applied on second update",
    profile2.displayName,
    expectedDisplayName2,
  );
  TestValidator.equals(
    "avatarUri applied on second update",
    profile2.avatarUri,
    updateBody2.avatarUri,
  );
  TestValidator.equals(
    "timezone remains Asia/Seoul",
    profile2.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals("locale remains en-US", profile2.locale, "en-US");
  TestValidator.equals(
    "bio applied on second update",
    profile2.bio,
    updateBody2.bio,
  );
  TestValidator.equals(
    "affiliation applied on second update",
    profile2.affiliation,
    updateBody2.affiliation,
  );
  TestValidator.equals(
    "website applied on second update",
    profile2.website,
    updateBody2.website,
  );
  TestValidator.equals(
    "location applied on second update",
    profile2.location,
    updateBody2.location,
  );

  // updatedAt must strictly increase on subsequent update
  const updatedAt2 = new Date(profile2.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt must increase after second update",
    updatedAt2 > updatedAt1,
  );
}
