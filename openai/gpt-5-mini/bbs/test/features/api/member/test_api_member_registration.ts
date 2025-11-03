import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_registration(
  connection: api.IConnection,
) {
  // 1) Prepare realistic, valid registration payload
  const username = `${RandomGenerator.alphabets(6)}${RandomGenerator.alphaNumeric(2)}`; // matches allowed pattern
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(9)}A!a1`; // >= 12 chars, includes mix
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies IDiscussionBoardMember.IJoin;

  // 2) Happy path: Register member
  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Business assertions
  TestValidator.predicate(
    "access token is present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "returned username matches requested",
    authorized.username,
    username,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );

  // If a lightweight member summary is included, confirm IDs match
  if (authorized.member !== undefined) {
    TestValidator.equals(
      "member summary id matches authorized id",
      authorized.member.id,
      authorized.id,
    );
  }

  // 3) Negative tests: uniqueness enforcement
  // 3a) Duplicate username (different email)
  const duplicateUsernameBody = {
    username,
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(10)}A!`,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  await TestValidator.error("duplicate username should fail", async () => {
    await api.functional.auth.member.join(connection, {
      body: duplicateUsernameBody,
    });
  });

  // 3b) Duplicate email (different username)
  const duplicateEmailBody = {
    username: `${RandomGenerator.alphaNumeric(8)}`,
    email,
    password: `${RandomGenerator.alphaNumeric(10)}!A`,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.member.join(connection, {
      body: duplicateEmailBody,
    });
  });

  // Note: Verifying creation of discussion_board_email_verifications artifact
  // is not possible with the provided SDK. The test validates issuance of
  // tokens and persisted member summary instead. To verify the email
  // verification artifact, the test harness must expose a debug/read API or
  // direct DB accessor which is not available now.
}
