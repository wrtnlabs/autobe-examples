import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_seller_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with approved status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email"> & tags.MinLength<1>
        >(),
        password: "password123",
        shop_name: RandomGenerator.name(),
      },
    });
  typia.assert(sellerJoinResponse);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResponse: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email"> & tags.MinLength<1>
        >(),
        password: "password123",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://example.com",
        referrer: "https://referrer.com",
      },
    });
  typia.assert(customerJoinResponse);
  // 3. Seller login
  const sellerLoginResponse: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerConnection, {
      body: {
        email: sellerJoinResponse.email,
        password: "password123",
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerLoginResponse);
  // 4. Customer login
  const customerLoginResponse: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_login(customerConnection, {
      body: {
        email: customerJoinResponse.customer.email,
        password: "password123",
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  typia.assert(customerLoginResponse);
  // 5. Create a refund request for a delivered order item
  // For this test, we'll create a refund request with a valid UUID
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Defective product",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 6. Seller retrieves refund request
  const retrieved =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrieved);
  // 7. Validate response
  TestValidator.equals(
    "refund request ID matches",
    retrieved.id,
    refundRequest.id,
  );
  TestValidator.equals("reason matches", retrieved.reason, "Defective product");
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("responded_at is null", retrieved.responded_at, null);
  TestValidator.predicate(
    "created_at exists",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrieved.updated_at !== undefined,
  );
}
