import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and get initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Verify initial seller metadata
  TestValidator.equals(
    "approval status is pending",
    initialAuth.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "is suspended is false",
    initialAuth.is_suspended === false,
  );
  // 3. Prepare refresh request with initial refresh token
  const refreshInput: IEcommerceMallSeller.IRefresh = {
    refresh_token: initialAuth.token.refresh,
  } satisfies IEcommerceMallSeller.IRefresh;
  // 4. Submit refresh request
  const refreshedAuth = await authorize_seller_refresh(
    { host: connection.host },
    { body: refreshInput },
  );
  typia.assert(refreshedAuth);
  // 5. Verify response structure
  TestValidator.notEquals(
    "access token is rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 6. Verify expired_at timestamps are updated (new tokens expire in future)
  const oldExpiredAt = new Date(initialAuth.token.expired_at);
  const newExpiredAt = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "new expired_at is in future compared to old",
    newExpiredAt.getTime() > oldExpiredAt.getTime(),
  );
  // 7. Verify seller metadata is preserved
  TestValidator.equals(
    "seller id is preserved",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "email is preserved",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "display name is preserved",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
  TestValidator.equals(
    "approval status is preserved",
    initialAuth.approval_status,
    refreshedAuth.approval_status,
  );
  TestValidator.equals(
    "is suspended is preserved",
    initialAuth.is_suspended,
    refreshedAuth.is_suspended,
  );
  // 8. Verify timestamp fields
  TestValidator.equals(
    "created_at is preserved",
    initialAuth.created_at,
    refreshedAuth.created_at,
  );
  // updated_at may be updated, so we just verify it exists and is a valid datetime
  typia.assert<string & tags.Format<"date-time">>(refreshedAuth.updated_at);
  TestValidator.equals("deleted_at is null", refreshedAuth.deleted_at, null);
  // 9. Verify refreshable_until is updated
  typia.assert<string & tags.Format<"date-time">>(
    refreshedAuth.token.refreshable_until,
  );
}
