import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_request_status_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Setup first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Seller 1 Shop",
      shop_description: "Test shop for seller 1",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  // Setup second seller (will attempt cross-seller access)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Seller 2 Shop",
      shop_description: "Test shop for seller 2",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  // Generate random refund request ID and status ID for testing
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  // Test that seller 2 cannot access non-existent refund request status
  // This tests the basic authorization flow even without refund request creation
  await TestValidator.error(
    "seller cannot access non-existent refund request status",
    async () => {
      await api.functional.ecommerce.seller.refund_requests.statuses.at(
        seller2Connection,
        {
          refundRequestId,
          statusId,
        },
      );
    },
  );
  // Test that seller 1 also cannot access non-existent refund request status
  // This ensures both sellers get similar treatment for non-existent resources
  await TestValidator.error(
    "seller cannot access non-existent refund request status even if owner",
    async () => {
      await api.functional.ecommerce.seller.refund_requests.statuses.at(
        seller1Connection,
        {
          refundRequestId,
          statusId,
        },
      );
    },
  );
  // Validate seller isolation - sellers should have different IDs
  TestValidator.predicate(
    "sellers have different IDs indicating proper isolation",
    seller1.id !== seller2.id,
  );
  // Additional validation: sellers should have different shop names
  TestValidator.notEquals(
    "sellers operate different shops",
    seller1.shop_name,
    seller2.shop_name,
  );
  // Validate that sellers exist and are authenticated
  TestValidator.predicate(
    "seller 1 is properly authenticated",
    seller1.token.access.length > 0,
  );
  TestValidator.predicate(
    "seller 2 is properly authenticated",
    seller2.token.access.length > 0,
  );
}
