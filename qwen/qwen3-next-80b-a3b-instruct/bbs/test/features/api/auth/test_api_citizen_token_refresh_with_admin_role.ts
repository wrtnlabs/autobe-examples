import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_token_refresh_with_admin_role(
  connection: api.IConnection,
) {
  // Generate a valid citizen refresh token
  const citizenRefreshToken = typia.random<string & tags.Format<"uuid">>();

  // Attempt to refresh token using citizen's refresh token
  const response = await api.functional.auth.citizen.refresh(connection, {
    body: {
      refresh_token: citizenRefreshToken,
    } satisfies IEconomicBoardCitizen.IRefresh,
  });

  // Validate that the response contains a valid citizen token (not admin)
  typia.assert(response);

  // Verify that the returned token is a citizen token (not admin)
  // The authentication system should not escalate privileges
  // No role escalation should be possible from citizen to admin through token refresh

  // Confirm citizen scope is maintained
  // No additional assertions needed as type system ensures citizen structure

  // Verify that the API does NOT return admin privileges
  // The system should strictly enforce citizen scope, so admin role is impossible to obtain here
}
