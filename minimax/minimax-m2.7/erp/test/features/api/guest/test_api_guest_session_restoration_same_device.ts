import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_restoration_same_device(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random device ID for this test
  const deviceId = typia.random<string & tags.Format<"uuid">>();
  // Generate URI values for href and referrer
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 1: First request - Create a guest session with specific device_id
  const firstSession = await authorize_guest_join(
    { host: connection.host },
    {
      body: {
        deviceId,
        href,
        referrer,
      },
    },
  );
  typia.assert(firstSession);
  // Step 2: Second request - Send another join request with identical device_id
  // System should restore the existing session, not create a duplicate
  const secondSession = await authorize_guest_join(
    { host: connection.host },
    {
      body: {
        deviceId,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(secondSession);
  // Validate: Session ID should be the same (same guest record reused)
  TestValidator.equals(
    "same guest session id restored",
    secondSession.id,
    firstSession.id,
  );
  // Validate: Device identifier should match the original device_id
  TestValidator.equals(
    "device identifier matches original device_id",
    secondSession.device_identifier,
    deviceId,
  );
  // Validate: New JWT tokens are generated (tokens should be DIFFERENT)
  TestValidator.notEquals(
    "access token regenerated (not same as first)",
    secondSession.token.access,
    firstSession.token.access,
  );
  TestValidator.notEquals(
    "refresh token regenerated (not same as first)",
    secondSession.token.refresh,
    firstSession.token.refresh,
  );
  // Validate: Session persistence - created_at should remain the same
  TestValidator.equals(
    "created_at unchanged (same guest record)",
    secondSession.created_at,
    firstSession.created_at,
  );
}
