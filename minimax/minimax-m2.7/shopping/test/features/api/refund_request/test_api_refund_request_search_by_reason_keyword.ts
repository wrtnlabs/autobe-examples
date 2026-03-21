import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_refund_request_search_by_reason_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Search without keyword - get all refund requests
  const allRefundRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRefundRequests);
  // Validate pagination structure
  TestValidator.equals(
    "current page is 1",
    allRefundRequests.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", allRefundRequests.pagination.limit, 20);
  // 3. Search with reason_keyword='damaged' (case-insensitive)
  const damagedRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          reason_keyword: "damaged",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(damagedRequests);
  // Validate that all returned requests contain 'damaged' in reason (case-insensitive)
  for (const request of damagedRequests.data) {
    TestValidator.predicate(
      "reason contains 'damaged' (case-insensitive)",
      request.reason.toLowerCase().includes("damaged"),
    );
  }
  // 4. Search with reason_keyword='wrong'
  const wrongRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          reason_keyword: "wrong",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(wrongRequests);
  // Validate that all returned requests contain 'wrong' in reason (case-insensitive)
  for (const request of wrongRequests.data) {
    TestValidator.predicate(
      "reason contains 'wrong' (case-insensitive)",
      request.reason.toLowerCase().includes("wrong"),
    );
  }
  // 5. Case-insensitive search validation (different cases)
  if (damagedRequests.data.length > 0) {
    // Get first word from first result as keyword for case testing
    const testKeyword = damagedRequests.data[0].reason.split(" ")[0];
    // Search with uppercase
    const upperCaseSearch =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {
            reason_keyword: testKeyword.toUpperCase(),
            limit: 20,
            page: 1,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(upperCaseSearch);
    // Search with lowercase
    const lowerCaseSearch =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {
            reason_keyword: testKeyword.toLowerCase(),
            limit: 20,
            page: 1,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(lowerCaseSearch);
    // Both searches should return the same results
    TestValidator.equals(
      "case-insensitive search returns same count",
      upperCaseSearch.data.length,
      lowerCaseSearch.data.length,
    );
  }
  // 6. Test pagination with keyword search
  if (damagedRequests.data.length > 0) {
    const paginatedRequests =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {
            reason_keyword: damagedRequests.data[0].reason.split(" ")[0],
            limit: 1,
            page: 1,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(paginatedRequests);
    TestValidator.equals("limit is 1", paginatedRequests.pagination.limit, 1);
    TestValidator.predicate(
      "data count does not exceed limit",
      paginatedRequests.data.length <= 1,
    );
    // Test second page if available
    if (paginatedRequests.pagination.pages > 1) {
      const secondPage =
        await api.functional.ecommerceMall.customer.refund_requests.index(
          customerConnection,
          {
            body: {
              reason_keyword: damagedRequests.data[0].reason.split(" ")[0],
              limit: 1,
              page: 2,
            } satisfies IEcommerceMallRefundRequest.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals("page is 2", secondPage.pagination.current, 2);
    }
  }
  // 7. Search with non-matching keyword
  const nonMatchingRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          reason_keyword: "nonexistent_unique_keyword_xyz_123",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(nonMatchingRequests);
  // Should return empty or fewer results than unfiltered search
  TestValidator.predicate(
    "non-matching keyword returns fewer or equal results",
    nonMatchingRequests.data.length <= allRefundRequests.data.length,
  );
  // 8. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination records >= data length when data exists",
    allRefundRequests.pagination.records >= allRefundRequests.data.length ||
      allRefundRequests.data.length === 0,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    allRefundRequests.pagination.pages ===
      Math.ceil(
        allRefundRequests.pagination.records /
          allRefundRequests.pagination.limit,
      ),
  );
}
