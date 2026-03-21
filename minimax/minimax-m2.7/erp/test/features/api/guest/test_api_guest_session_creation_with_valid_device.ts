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

export async function test_api_guest_session_creation_with_valid_device(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid UUID for device_id
  const deviceId = typia.random<string & tags.Format<"uuid">>();
  // Generate valid URIs for href and referrer
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Generate valid IPv4 address
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Generate valid email for optional temporaryEmail
  const temporaryEmail = typia.random<string & tags.Format<"email">>();
  // Create guest session with valid device
  const body = {
    deviceId,
    href,
    referrer,
    ip,
    temporaryEmail,
  } satisfies IErpHrmGuest.IJoin;
  const guest = await api.functional.erpHrm.auth.guest.join(connection, {
    body,
  });
  typia.assert(guest);
  // Validate response structure
  TestValidator.equals(
    "device_identifier matches input",
    guest.device_identifier,
    deviceId,
  );
  TestValidator.equals(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
    true,
  );
  // Validate token structure
  TestValidator.predicate(
    "access token is non-empty string",
    guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    guest.token.refresh.length > 0,
  );
  // Validate token expiration times
  const now = new Date();
  const expiredAt = new Date(guest.token.expired_at);
  const refreshableUntil = new Date(guest.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until extends beyond expiration",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // Validate timestamps are valid ISO 8601
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(guest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(guest.updated_at)),
  );
  // Validate deleted_at is null for newly created guest
  TestValidator.equals("deleted_at is null", guest.deleted_at, null);
}
