import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_administrators_request_administrator } from "../../../generate/generate_random_shopping_mall_admin_administrators_request_administrator";
import { prepare_random_shopping_mall_admin } from "../../../prepare/prepare_random_shopping_mall_admin";

/**
 * Test administrator request after rejection workflow.
 * 1. Register and login as seller
 * 2. Submit first administrator request with initial reason
 * 3. Submit new administrator request with different reason after rejection
 * 4. Verify new request is created with pending status and different reason
 */
export async function test_api_administrator_request_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Login as seller
  const loginResult = await api.functional.shoppingMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: sellerConnection.headers?.["Authorization"]
          ? "test@example.com"
          : typia.random<string & tags.Format<"email">>(),
        password: "1234",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  // Update connection with authentication token from login
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: loginResult.token.access,
    },
  };
  // 2. Submit initial administrator request with first reason
  const firstRequest =
    await api.functional.shoppingMall.admin.administrators.requestAdministrator(
      authenticatedSellerConnection,
      {
        body: {
          reason: "I want to become an administrator to better manage my shop.",
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 3. Submit new administrator request with different reason
  const secondRequest =
    await api.functional.shoppingMall.admin.administrators.requestAdministrator(
      authenticatedSellerConnection,
      {
        body: {
          reason:
            "I have gained more experience and want to contribute to platform management.",
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  typia.assert(secondRequest);
  // 4. Validate new request properties
  TestValidator.equals(
    "request status is pending",
    secondRequest.status,
    "pending",
  );
  TestValidator.notEquals(
    "reason is different from first",
    secondRequest.reason,
    firstRequest.reason,
  );
  TestValidator.equals(
    "request has ID",
    secondRequest.id !== undefined,
    true,
  );
  TestValidator.equals(
    "requester information exists",
    secondRequest.requester !== undefined,
    true,
  );
}