import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success_token_issued(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const input: IShoppingMallGuest.IJoin = {
    fingerprint: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IJoin;
  const output: IShoppingMallGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body: input },
  );
  typia.assert(output);
  TestValidator.predicate(
    "guest session id should be non-empty",
    () => output.id.length > 0,
  );
  TestValidator.predicate(
    "access token should be non-empty",
    () => output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    () => output.token.refresh.length > 0,
  );
  const expiredMs = Date.parse(output.expired_at);
  const refreshableMs = Date.parse(output.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    () => refreshableMs > expiredMs,
  );
  TestValidator.predicate("access token should look like JWT", () =>
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(
      output.token.access,
    ),
  );
  TestValidator.equals("deleted_at should be null", output.deleted_at, null);
}
