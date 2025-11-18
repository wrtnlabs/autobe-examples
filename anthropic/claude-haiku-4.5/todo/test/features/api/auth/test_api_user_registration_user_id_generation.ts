import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_user_id_generation(
  connection: api.IConnection,
) {
  // Register the first user
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>().toLowerCase(),
        password:
          RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);

  // Register the second user
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>().toLowerCase(),
        password:
          RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);

  // Register the third user
  const user3: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>().toLowerCase(),
        password:
          RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user3);

  // Validate that each user ID is a valid UUID format (standard UUID pattern)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  TestValidator.predicate(
    "user1 ID should be valid UUID format",
    uuidRegex.test(user1.id),
  );

  TestValidator.predicate(
    "user2 ID should be valid UUID format",
    uuidRegex.test(user2.id),
  );

  TestValidator.predicate(
    "user3 ID should be valid UUID format",
    uuidRegex.test(user3.id),
  );

  // Validate that all IDs are unique across different user registrations
  TestValidator.notEquals(
    "user1 and user2 should have different IDs",
    user1.id,
    user2.id,
  );

  TestValidator.notEquals(
    "user2 and user3 should have different IDs",
    user2.id,
    user3.id,
  );

  TestValidator.notEquals(
    "user1 and user3 should have different IDs",
    user1.id,
    user3.id,
  );
}
