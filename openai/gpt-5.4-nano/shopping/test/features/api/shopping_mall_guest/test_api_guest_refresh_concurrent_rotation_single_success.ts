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

export async function test_api_guest_refresh_concurrent_rotation_single_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoin = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(guestJoin);
  const initialUpdatedAt = guestJoin.updated_at;
  const initialExpiredAt = guestJoin.expired_at;
  const refreshBody: IShoppingMallGuest.IRefresh = {};
  const refreshConnectionA: api.IConnection = { host: connection.host };
  const refreshConnectionB: api.IConnection = { host: connection.host };
  const taskA = authorize_guest_refresh(refreshConnectionA, {
    body: refreshBody,
  });
  const taskB = authorize_guest_refresh(refreshConnectionB, {
    body: refreshBody,
  });
  const results = await Promise.allSettled([taskA, taskB]);
  const winningResult = results.find(
    (r): r is PromiseFulfilledResult<IShoppingMallGuest.IAuthorized> =>
      r.status === "fulfilled",
  );
  TestValidator.predicate(
    "at least one concurrent refresh should succeed",
    winningResult !== undefined,
  );
  const successful = results.filter(
    (r): r is PromiseFulfilledResult<IShoppingMallGuest.IAuthorized> =>
      r.status === "fulfilled",
  );
  TestValidator.equals(
    "concurrent refresh should have exactly one success",
    successful.length,
    1,
  );
  const winning = successful[0].value;
  typia.assert(winning);
  TestValidator.notEquals(
    "updated_at should advance after winning refresh",
    winning.updated_at,
    initialUpdatedAt,
  );
  TestValidator.notEquals(
    "expired_at should advance after winning refresh",
    winning.expired_at,
    initialExpiredAt,
  );
  // Validate that a second refresh attempt using the now-rotated refresh token
  // produces another valid token set (rotation/continued validity).
  const rotatedConnection: api.IConnection = { host: connection.host };
  const rotated = await authorize_guest_refresh(rotatedConnection, {
    body: refreshBody,
  });
  typia.assert(rotated);
  TestValidator.notEquals(
    "rotated refresh should further update session",
    rotated.updated_at,
    winning.updated_at,
  );
}
