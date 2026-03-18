import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_returns_tokens_and_reusable_identity(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: primary success
  const guestConnection1: api.IConnection = { host: connection.host };
  const deviceFingerprint1 =
    `${RandomGenerator.alphabets(16)}-${RandomGenerator.alphabets(8)}` satisfies string;
  const authorized1: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection1, {
      body: {
        deviceFingerprint: deviceFingerprint1,
      } satisfies IMultiUserTodoGuest.IJoin,
    });
  typia.assert(authorized1);
  const access1 = authorized1.token.access;
  const refresh1 = authorized1.token.refresh;
  TestValidator.predicate(
    "access token should be non-empty",
    access1.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    refresh1.length > 0,
  );
  const expiredAt1 = new Date(authorized1.token.expired_at);
  const refreshableUntil1 = new Date(authorized1.token.refreshable_until);
  TestValidator.predicate(
    "expired_at should be <= refreshable_until",
    expiredAt1.getTime() <= refreshableUntil1.getTime(),
  );
  // Scenario 2: idempotency/reuse via deviceFingerprint
  const guestConnection2: api.IConnection = { host: connection.host };
  const authorized2: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection2, {
      body: {
        deviceFingerprint: deviceFingerprint1,
      } satisfies IMultiUserTodoGuest.IJoin,
    });
  typia.assert(authorized2);
  TestValidator.equals(
    "guest id should be reusable",
    authorized2.id,
    authorized1.id,
  );
  TestValidator.notEquals(
    "access token should be re-issued",
    authorized2.token.access,
    authorized1.token.access,
  );
  TestValidator.predicate(
    "expired_at should be <= refreshable_until (second join)",
    new Date(authorized2.token.expired_at).getTime() <=
      new Date(authorized2.token.refreshable_until).getTime(),
  );
  // Scenario 3: auth boundary (no existing authenticated context required)
  const guestConnection3: api.IConnection = { host: connection.host };
  const deviceFingerprint3 =
    `${RandomGenerator.alphabets(12)}-${RandomGenerator.alphabets(12)}` satisfies string;
  const authorized3: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection3, {
      body: {
        deviceFingerprint: deviceFingerprint3,
      } satisfies IMultiUserTodoGuest.IJoin,
    });
  typia.assert(authorized3);
  TestValidator.predicate(
    "third join access token should be non-empty",
    authorized3.token.access.length > 0,
  );
}
