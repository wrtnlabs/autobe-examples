import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

/**
 * Validate duplicate member registration (username/email uniqueness).
 *
 * Scenario:
 *
 * 1. Register a new member with a generated username and email.
 * 2. Attempt to register another member using the same username but a different
 *    email -> expect a runtime error (uniqueness conflict).
 * 3. Attempt to register another member using the same email but a different
 *    username -> expect a runtime error (uniqueness conflict).
 * 4. Register a fully unique second member to ensure normal registration still
 *    works and that the original member record remains intact.
 */
export async function test_api_member_join_duplicate_username_or_email_conflict(
  connection: api.IConnection,
) {
  // 1) Prepare unique credentials for the first member
  const username1 = RandomGenerator.alphaNumeric(8);
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = `${RandomGenerator.alphaNumeric(10)}!`;

  const body1 = {
    username: username1,
    email: email1,
    password: password1,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  // 2) Create the initial member
  // Note: sdk.join will assign connection.headers.Authorization = output.token.access
  // automatically. Tests must not mutate connection.headers manually.
  const member1: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: body1,
    });
  typia.assert(member1);

  // 3) Attempt duplicate username (different email) - should fail
  const emailForDupUsername = typia.random<string & tags.Format<"email">>();
  const bodyDupUsername = {
    username: username1, // same username
    email: emailForDupUsername,
    password: `${RandomGenerator.alphaNumeric(10)}!`,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  await TestValidator.error("duplicate username should fail", async () => {
    await api.functional.auth.member.join(connection, {
      body: bodyDupUsername,
    });
  });

  // 4) Attempt duplicate email (different username) - should fail
  const usernameForDupEmail = RandomGenerator.alphaNumeric(8);
  const bodyDupEmail = {
    username: usernameForDupEmail,
    email: email1, // same email as first member
    password: `${RandomGenerator.alphaNumeric(10)}!`,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.member.join(connection, { body: bodyDupEmail });
  });

  // 5) Create a second unique member to ensure normal registration still works
  const username2 = RandomGenerator.alphaNumeric(8);
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = `${RandomGenerator.alphaNumeric(10)}!`;

  const body2 = {
    username: username2,
    email: email2,
    password: password2,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member2: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: body2 });
  typia.assert(member2);

  // 6) Validate that two successful creations have different ids
  TestValidator.notEquals("member ids should differ", member1.id, member2.id);

  // 7) Re-assert original member remains valid
  typia.assert(member1);
  TestValidator.predicate(
    "original member has an id",
    typeof member1.id === "string",
  );
}
