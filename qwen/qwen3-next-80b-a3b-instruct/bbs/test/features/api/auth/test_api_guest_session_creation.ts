import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";

export async function test_api_guest_session_creation(
  connection: api.IConnection,
) {
  const guestSession: IEconomicBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestSession);
}
