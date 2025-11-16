import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";

export async function test_api_guest_join_duplicate_username_allowed(
  connection: api.IConnection,
) {
  // Use same username for both guest accounts
  const sharedUsername = RandomGenerator.name();

  // Create first guest session
  const guest1 = await api.functional.auth.guest.join(connection, {
    body: {
      username: sharedUsername,
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    } satisfies IEconomicDiscussionGuest.ICreate,
  });
  typia.assert(guest1);

  // Validate first guest was created successfully
  TestValidator.equals(
    "first guest username matches",
    guest1.username,
    sharedUsername,
  );
  TestValidator.equals(
    "first guest articles count",
    guest1.articles_viewed_count,
    0,
  );
  TestValidator.equals(
    "first guest downloads count",
    guest1.downloads_count,
    0,
  );

  // Create second guest session with same username
  const guest2 = await api.functional.auth.guest.join(connection, {
    body: {
      username: sharedUsername,
      user_agent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    } satisfies IEconomicDiscussionGuest.ICreate,
  });
  typia.assert(guest2);

  // Validate second guest exists and has different ID than first
  TestValidator.equals(
    "second guest username matches first",
    guest2.username,
    sharedUsername,
  );
  TestValidator.notEquals("guest IDs are unique", guest2.id, guest1.id);
  TestValidator.equals(
    "second guest articles count",
    guest2.articles_viewed_count,
    0,
  );
  TestValidator.equals(
    "second guest downloads count",
    guest2.downloads_count,
    0,
  );

  // Both guests should have valid tokens
  TestValidator.predicate(
    "first guest token exists",
    typeof guest1.token.access === "string",
  );
  TestValidator.predicate(
    "second guest token exists",
    typeof guest2.token.access === "string",
  );
  TestValidator.notEquals(
    "tokens are unique",
    guest1.token.access,
    guest2.token.access,
  );
}
