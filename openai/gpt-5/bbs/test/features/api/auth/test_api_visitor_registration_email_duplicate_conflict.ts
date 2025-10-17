import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitor";
import type { IEconDiscussVisitorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorJoin";

/**
 * Validate duplicate email handling for Visitor registration.
 *
 * This test verifies that:
 *
 * 1. A first-time registration with a unique email succeeds and returns an
 *    authorized session (id + token).
 * 2. A second registration attempt using the same email is rejected due to unique
 *    email constraint (asserted as an error without checking specific HTTP
 *    status codes).
 * 3. Registering again with a different unique email still succeeds, and the newly
 *    created user id differs from the first one.
 *
 * Notes:
 *
 * - Do not manipulate connection.headers; the SDK manages tokens automatically on
 *   successful auth calls.
 * - Use typia.assert on successful responses only; it guarantees full type/format
 *   validation (UUID, date-time, etc.).
 */
export async function test_api_visitor_registration_email_duplicate_conflict(
  connection: api.IConnection,
) {
  // 1) First-time registration with a unique email should succeed.
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = "P@ssw0rd!"; // >= 8 chars to satisfy MinLength<8>
  const joinBody1 = {
    email: email1,
    password: password1,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVisitorJoin.ICreate;

  const first = await api.functional.auth.visitor.join(connection, {
    body: joinBody1,
  });
  typia.assert(first); // IEconDiscussVisitor.IAuthorized

  // 2) Duplicate registration attempt using the same email should fail.
  const duplicateJoinBody = {
    email: email1, // same email to trigger unique constraint
    password: password1,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVisitorJoin.ICreate;

  await TestValidator.error(
    "duplicate email registration must be rejected",
    async () => {
      await api.functional.auth.visitor.join(connection, {
        body: duplicateJoinBody,
      });
    },
  );

  // 3) Registration with a different unique email should still succeed.
  const email2 = typia.random<string & tags.Format<"email">>();
  const joinBody2 = {
    email: email2,
    password: password1,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVisitorJoin.ICreate;

  const second = await api.functional.auth.visitor.join(connection, {
    body: joinBody2,
  });
  typia.assert(second); // IEconDiscussVisitor.IAuthorized

  // Business validation: ensure distinct principals were created.
  TestValidator.notEquals(
    "second registration must create a different user id",
    second.id,
    first.id,
  );
}
