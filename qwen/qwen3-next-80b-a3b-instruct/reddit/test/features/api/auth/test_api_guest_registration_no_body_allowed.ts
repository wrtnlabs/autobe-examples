import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

export async function test_api_guest_registration_no_body_allowed(
  connection: api.IConnection,
) {
  // Test 1: Successful guest registration with empty body - this is the only valid scenario
  const guest: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest);
  TestValidator.equals("guest has valid UUID", typeof guest.id, "string");
  TestValidator.equals(
    "guest has valid access token",
    guest.token.access.length > 10,
    true,
  );
}
