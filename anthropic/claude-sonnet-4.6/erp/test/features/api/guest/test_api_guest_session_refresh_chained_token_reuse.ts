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

export async function test_api_guest_session_refresh_chained_token_reuse(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session via join
  const guestConnection: api.IConnection = { host: connection.host };
  const initial = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initial);
  const originalId = initial.id;
  const originalFingerprint = initial.fingerprint;
  const refresh1 = initial.token.refresh;
  // Step 2: First refresh — use refresh1 to get new tokens
  const guestConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_guest_refresh(guestConnection1, {
    body: { refresh: refresh1 } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(authorized1);
  // Validations after first refresh
  TestValidator.equals(
    "first refresh: guest id stable",
    authorized1.id,
    originalId,
  );
  TestValidator.equals(
    "first refresh: guest fingerprint stable",
    authorized1.fingerprint,
    originalFingerprint,
  );
  TestValidator.predicate(
    "first refresh: access token non-empty",
    authorized1.token.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh: refresh token non-empty",
    authorized1.token.refresh.length > 0,
  );
  const refresh2 = authorized1.token.refresh;
  // Step 3: Second refresh — use refresh2 to get new tokens
  const guestConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_guest_refresh(guestConnection2, {
    body: { refresh: refresh2 } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(authorized2);
  // Validations after second refresh
  TestValidator.equals(
    "second refresh: guest id stable",
    authorized2.id,
    originalId,
  );
  TestValidator.equals(
    "second refresh: guest fingerprint stable",
    authorized2.fingerprint,
    originalFingerprint,
  );
  TestValidator.predicate(
    "second refresh: access token non-empty",
    authorized2.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh: expired_at is future datetime",
    new Date(authorized2.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "second refresh: refreshable_until is future datetime",
    new Date(authorized2.token.refreshable_until).getTime() > Date.now(),
  );
}
