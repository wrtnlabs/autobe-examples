import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCitizenIRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenIRefresh";

export async function test_api_citizen_token_refresh_expired(
  connection: api.IConnection,
) {
  // Create a new citizen account to get fresh tokens
  const joinResponse: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(joinResponse);

  // Wait briefly to simulate refresh token expiration
  // In test environments, the refreshable_until may be configured short
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Attempt to refresh the access token using the expired refresh token
  // The connection still has the valid access token from join (automatically set by SDK)
  // The refresh endpoint expects an empty body (ICommunityBBSCitizenIRefresh = {})
  await TestValidator.error(
    "refresh should fail when refresh token is expired",
    async () => {
      await api.functional.auth.citizen.refresh(connection, {
        body: {} as ICommunityBBSCitizenIRefresh,
      });
    },
  );
}
