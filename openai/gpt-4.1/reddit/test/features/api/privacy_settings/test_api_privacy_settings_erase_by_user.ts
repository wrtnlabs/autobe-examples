import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate regular user self-service deletion (soft delete) of their own
 * privacy settings.
 *
 * 1. Register and authenticate a new user (collect their user id as
 *    privacySettingsId surrogate).
 * 2. Erase their own privacy settings.
 * 3. Verify that the response is void.
 * 4. (Skipped: Confirming subsequent fetches are inaccessible, as no fetch/read
 *    endpoint is provided.)
 */
export async function test_api_privacy_settings_erase_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformUser.IJoin;
  const authorized = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Step 2: Erase privacy settings for self (simulate privacySettingsId with user's id since no explicit endpoint/type)
  const privacySettingsId = authorized.id; // using user id as settings id surrogate for e2e
  const eraseResult =
    await api.functional.communityPlatform.user.privacySettings.erase(
      connection,
      {
        privacySettingsId,
      },
    );
  TestValidator.equals(
    "erase endpoint returns void (no body)",
    eraseResult,
    undefined,
  );

  // Step 3: No way to fetch privacySettings after erasure given current API/materials
}
