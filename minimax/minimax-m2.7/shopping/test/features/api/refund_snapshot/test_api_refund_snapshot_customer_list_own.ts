import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_snapshot_customer_list_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customer = await authorize_customer_join(connection, {});
  // 2. Create customer-specific connection with token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customer.token.access;
  // 3. Call the refund request snapshots endpoint with empty filters
  const response =
    await api.functional.ecommerceMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  // 4. Validate response with typia.assert
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current is valid",
    response.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    response.pagination.pages >= 0,
    true,
  );
  // 6. Validate data array exists
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 7. Validate snapshot structure if data exists
  for (const snapshot of response.data) {
    TestValidator.equals(
      "snapshot has id",
      typeof snapshot.id === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has snapshot_reason",
      typeof snapshot.snapshot_reason === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has snapshot_status",
      typeof snapshot.snapshot_status === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has seller_response",
      typeof snapshot.seller_response === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has customer summary",
      snapshot.customer !== undefined && snapshot.customer !== null,
      true,
    );
    TestValidator.equals(
      "snapshot has refundRequest summary",
      snapshot.refundRequest !== undefined && snapshot.refundRequest !== null,
      true,
    );
    TestValidator.equals(
      "snapshot has seller summary",
      snapshot.seller !== undefined && snapshot.seller !== null,
      true,
    );
  }
}
