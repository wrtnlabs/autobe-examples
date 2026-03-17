import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare browser context data for guest session creation
  const body = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallGuest.IJoin;
  // Execute guest join using mandatory utility function
  const authorized = await authorize_guest_join(guestConnection, { body });
  // Validate complete response structure with runtime type checking
  typia.assert(authorized);
  // Validate business logic: new guest account should be active
  TestValidator.equals(
    "new guest is active (deletedAt is null)",
    authorized.deletedAt,
    null,
  );
  // Validate session was created and associated
  TestValidator.predicate(
    "sessions array contains created session",
    authorized.sessions.length >= 1,
  );
  // Validate authorization token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp exists",
    !!authorized.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until timestamp exists",
    !!authorized.token.refreshable_until,
  );
}
