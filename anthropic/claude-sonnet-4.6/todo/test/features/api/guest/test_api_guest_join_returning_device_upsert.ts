import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_returning_device_upsert(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint to identify this guest
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  // First join: create the guest connection and call authorize_guest_join
  const guestConnection1: api.IConnection = { host: connection.host };
  const firstResponse = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: deviceFingerprint,
      href,
      referrer: null,
    },
  });
  typia.assert(firstResponse);
  // Record first response data
  const firstId = firstResponse.id;
  const firstCreatedAt = firstResponse.created_at;
  const firstUpdatedAt = firstResponse.updated_at;
  const firstAccessToken = firstResponse.token.access;
  const firstRefreshToken = firstResponse.token.refresh;
  // Second join: same device fingerprint, new connection object
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondHref = typia.random<string & tags.Format<"uri">>();
  const secondResponse = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: secondHref,
      referrer: null,
    },
  });
  typia.assert(secondResponse);
  // Validate upsert semantics: same guest identity
  TestValidator.equals(
    "returning guest has same id",
    secondResponse.id,
    firstId,
  );
  // Validate device_fingerprint echoed correctly
  TestValidator.equals(
    "device fingerprint matches",
    secondResponse.device_fingerprint,
    deviceFingerprint,
  );
  // Validate created_at is unchanged (upsert does not recreate record)
  TestValidator.equals(
    "created_at is stable across rejoins",
    secondResponse.created_at,
    firstCreatedAt,
  );
  // Validate updated_at is refreshed (>= first updated_at)
  TestValidator.predicate(
    "updated_at is refreshed on returning join",
    new Date(secondResponse.updated_at) >= new Date(firstUpdatedAt),
  );
  // Validate new tokens are issued (access token should differ)
  TestValidator.notEquals(
    "new access token issued on second join",
    secondResponse.token.access,
    firstAccessToken,
  );
  // Validate new refresh token is issued
  TestValidator.notEquals(
    "new refresh token issued on second join",
    secondResponse.token.refresh,
    firstRefreshToken,
  );
}
