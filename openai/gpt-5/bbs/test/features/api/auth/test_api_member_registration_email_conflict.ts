import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Member registration duplicate email conflict flow.
 *
 * Validates that initial registration with a unique email succeeds, a second
 * registration attempt with the same email fails (business rule on unique
 * email), and a subsequent registration with a different email succeeds.
 *
 * Notes:
 *
 * - No HTTP status code assertions are performed; only the fact of failure is
 *   validated for the duplicate case.
 * - Request bodies strictly follow IEconDiscussMember.ICreate using `satisfies`.
 * - Each call uses a fresh unauthenticated connection object to avoid token
 *   side-effects, complying with SDK header management rules.
 *
 * Steps:
 *
 * 1. POST /auth/member/join with unique email -> success
 * 2. POST /auth/member/join with same email -> error (duplicate)
 * 3. POST /auth/member/join with different email -> success
 */
export async function test_api_member_registration_email_conflict(
  connection: api.IConnection,
) {
  // 1) Successful registration with a unique email
  const conn1: api.IConnection = { ...connection, headers: {} };
  const email1 = typia.random<string & tags.Format<"email">>();
  const createBody1 = {
    email: email1,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  const first = await api.functional.auth.member.join(conn1, {
    body: createBody1,
  });
  typia.assert(first);
  if (first.member !== undefined) {
    TestValidator.equals(
      "authorized subject id matches top-level id",
      first.member.id,
      first.id,
    );
  }

  // 2) Duplicate registration attempt using the same email must fail
  const conn2: api.IConnection = { ...connection, headers: {} };
  const duplicateBody = {
    email: email1,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  await TestValidator.error(
    "duplicate email registration must fail",
    async () => {
      await api.functional.auth.member.join(conn2, { body: duplicateBody });
    },
  );

  // 3) Stability check: a different email should register successfully
  const conn3: api.IConnection = { ...connection, headers: {} };
  const email2 = typia.random<string & tags.Format<"email">>();
  const createBody2 = {
    email: email2,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  const second = await api.functional.auth.member.join(conn3, {
    body: createBody2,
  });
  typia.assert(second);

  TestValidator.notEquals(
    "different accounts should have distinct IDs",
    second.id,
    first.id,
  );
}
