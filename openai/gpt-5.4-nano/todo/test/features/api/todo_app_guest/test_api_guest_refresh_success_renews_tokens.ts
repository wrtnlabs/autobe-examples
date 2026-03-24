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

export async function test_api_guest_refresh_success_renews_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a guest to obtain initial tokens
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    device_identifier: RandomGenerator.alphaNumeric(32),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppGuest.IJoin;
  const initialAuth = await authorize_guest_join(guestJoinConnection, {
    body: joinInput,
  });
  typia.assert(initialAuth);
  const initialToken = initialAuth.token;
  // 2) Refresh tokens
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {} satisfies ITodoAppGuest.IRefresh;
  const renewedAuth = await authorize_guest_refresh(guestRefreshConnection, {
    body: refreshBody,
  });
  typia.assert(renewedAuth);
  const renewedToken = renewedAuth.token;
  // 3) Business assertions
  TestValidator.equals(
    "guest identity id should remain the same",
    renewedAuth.id,
    initialAuth.id,
  );
  TestValidator.notEquals(
    "access token should be renewed",
    renewedToken.access,
    initialToken.access,
  );
  TestValidator.predicate(
    "access token expired_at should be later",
    renewedToken.expired_at > initialToken.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until should not move backward",
    renewedToken.refreshable_until >= initialToken.refreshable_until,
  );
  TestValidator.predicate(
    "renewed refresh token should be a non-empty string",
    renewedToken.refresh.length > 0,
  );
}
