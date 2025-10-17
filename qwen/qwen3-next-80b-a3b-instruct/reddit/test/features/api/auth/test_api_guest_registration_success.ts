import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

export async function test_api_guest_registration_success(
  connection: api.IConnection,
) {
  // Perform guest registration
  const guestResponse: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Validate the entire response structure with typia.assert()
  // This performs complete validation of UUID format, date-time formats, token structure, and all other type constraints
  typia.assert(guestResponse);
}
