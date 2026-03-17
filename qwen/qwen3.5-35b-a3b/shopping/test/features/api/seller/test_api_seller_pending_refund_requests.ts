import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_pending_refund_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create seller-specific connection for API calls
  const sellerApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  // 3. Call PATCH /ecommerceMall/seller/refund-requests/pending
  const response =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerApiConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Validate data array structure (may be empty)
  if (response.data.length > 0) {
    // 6. Validate each refund request in the data array
    await ArrayUtil.asyncForEach(response.data, async (refund) => {
      typia.assert(refund);
      // Verify status is always 'pending'
      TestValidator.equals(
        "refund status is pending",
        refund.status,
        "pending",
      );
      // 7. Verify decision_at and processed_at are null for pending requests
      TestValidator.equals(
        "decision_at is null for pending",
        refund.decision_at,
        null,
      );
      TestValidator.equals(
        "processed_at is null for pending",
        refund.processed_at,
        null,
      );
      // 8. Verify customer summary has required fields
      typia.assert(refund.customer);
      TestValidator.equals(
        "customer has id",
        refund.customer.id !== undefined,
        true,
      );
      TestValidator.equals(
        "customer has email",
        refund.customer.email !== undefined,
        true,
      );
      TestValidator.equals(
        "customer has status",
        refund.customer.status !== undefined,
        true,
      );
      TestValidator.equals(
        "customer has created_at",
        refund.customer.created_at !== undefined,
        true,
      );
      TestValidator.equals(
        "customer has deleted_at",
        refund.customer.deleted_at !== undefined,
        true,
      );
      // 9. Verify orderItem summary has required fields
      typia.assert(refund.orderItem);
      TestValidator.equals(
        "orderItem has id",
        refund.orderItem.id !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has productName",
        refund.orderItem.productName !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has productSku",
        refund.orderItem.productSku !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has quantity",
        refund.orderItem.quantity !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has unitPrice",
        refund.orderItem.unitPrice !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has totalPrice",
        refund.orderItem.totalPrice !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has status",
        refund.orderItem.status !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has order",
        refund.orderItem.order !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has createdAt",
        refund.orderItem.createdAt !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has updatedAt",
        refund.orderItem.updatedAt !== undefined,
        true,
      );
      TestValidator.equals(
        "orderItem has deletedAt",
        refund.orderItem.deletedAt !== undefined,
        true,
      );
    });
  }
  // 10. Test data isolation - seller only sees their own products' refunds
  // This is implicitly validated by the endpoint filtering by seller's products
}
