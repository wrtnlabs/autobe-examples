import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the guest registration using the unique device fingerprint internally managed by the system.
 *
 * 1. Successfully register a new guest.
 * 2. Verify that the response includes the guest authorization token with valid access and refresh JWT tokens.
 * 3. Attempt to register duplicate guest (the server enforces unique device fingerprint internally) and expect a failure.
 */
export async function test_api_guest_join_unique_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create base connection
  const baseConnection: api.IConnection = { host: connection.host };
  // First join - expect success
  const guest1 = await authorize_guest_join(baseConnection, {
    body: {},
  });
  typia.assert(guest1);
  // Validate the token properties
  const token = guest1.token;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid date-time",
    !Number.isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is a valid date-time",
    !Number.isNaN(Date.parse(token.refreshable_until)),
  );
  // Second join - expect error due to duplicate device fingerprint
  await TestValidator.error(
    "duplicate device fingerprint registration",
    async () => {
      await authorize_guest_join(baseConnection, {
        body: {},
      });
    },
  );
}
