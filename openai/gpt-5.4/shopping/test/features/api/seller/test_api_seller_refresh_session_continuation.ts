import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_session_continuation(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh: joined.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("seller id is preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "seller email is preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "approval status is preserved",
    refreshed.approval_status,
    joined.approval_status,
  );
  TestValidator.equals(
    "rejection reason is preserved",
    refreshed.rejection_reason,
    joined.rejection_reason,
  );
  TestValidator.equals(
    "suspended flag is preserved",
    refreshed.suspended,
    joined.suspended,
  );
  TestValidator.equals(
    "banned flag is preserved",
    refreshed.banned,
    joined.banned,
  );
  TestValidator.equals(
    "deleted timestamp is preserved",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.equals(
    "created timestamp is preserved",
    refreshed.created_at,
    joined.created_at,
  );
  TestValidator.notEquals(
    "access token is rotated on refresh",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated on refresh",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "refreshed access expiration metadata exists",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable-until metadata exists",
    refreshed.token.refreshable_until.length > 0,
  );
}
