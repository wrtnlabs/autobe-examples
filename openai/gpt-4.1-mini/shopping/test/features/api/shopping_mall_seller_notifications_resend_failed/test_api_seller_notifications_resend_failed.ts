import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMall";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_notifications_resend_failed(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Primary success path for resending failed notifications.
  // 1. Register a new seller account and acquire sellerConnection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {}, // IShoppingMallSeller.IJoin has no properties
  });
  typia.assert(authorizedSeller);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Attempt to resend failed notifications with empty criteria (assumed to match failed deliveries)
  const resendResponse1 =
    await api.functional.shoppingMall.seller.notifications.resend_failed.resendFailed(
      sellerConnection,
      {
        body: {}, // IShoppingMall.IRequest has no properties; empty object
      },
    );
  typia.assert(resendResponse1);
  // We do not have direct access to DB here, so we rely on response for validation
  // Validate response contains counts (assuming the response has properties for counts - since schema is empty object, only typia validation is possible)
  // The scenario mentions counts, but the IShoppingMall.IResponse schema is empty, so no property validation possible
  // 3. Call resend again to test idempotent behavior
  const resendResponse2 =
    await api.functional.shoppingMall.seller.notifications.resend_failed.resendFailed(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(resendResponse2);
  // Test scenario 2: No matching failed notifications to resend
  // Register another seller account
  const sellerJoinConnection2: api.IConnection = { host: connection.host };
  const authorizedSeller2 = await authorize_seller_join(sellerJoinConnection2, {
    body: {},
  });
  typia.assert(authorizedSeller2);
  const sellerConnection2: api.IConnection = { host: connection.host };
  sellerConnection2.headers = { Authorization: authorizedSeller2.token.access };
  // Call resend-failed with criteria that matches no failed notifications (assuming criteria can be empty object, no other criteria available in schema)
  const resendResponse3 =
    await api.functional.shoppingMall.seller.notifications.resend_failed.resendFailed(
      sellerConnection2,
      {
        body: {},
      },
    );
  typia.assert(resendResponse3);
  // Test scenario 3: Authorization enforcement
  // Try to call resend-failed without authentication
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to resend failed notifications",
    401,
    async () => {
      await api.functional.shoppingMall.seller.notifications.resend_failed.resendFailed(
        anonymousConnection,
        {
          body: {},
        },
      );
    },
  );
  // Call resend-failed with authorized seller
  const authorizedConnection: api.IConnection = { host: connection.host };
  const authorizedSeller3 = await authorize_seller_join(authorizedConnection, {
    body: {},
  });
  typia.assert(authorizedSeller3);
  const sellerConnection3: api.IConnection = { host: connection.host };
  sellerConnection3.headers = { Authorization: authorizedSeller3.token.access };
  const resendResponse4 =
    await api.functional.shoppingMall.seller.notifications.resend_failed.resendFailed(
      sellerConnection3,
      {
        body: {},
      },
    );
  typia.assert(resendResponse4);
}
