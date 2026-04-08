import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_customer_refund_request_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create at least 3 refund requests to test pagination across multiple pages
  const refundRequestCount = 3;
  const createdRefundRequests: IEcommerceMallRefundRequest[] = [];
  for (let i = 0; i < refundRequestCount; i++) {
    const refundRequest =
      await generate_random_ecommerce_mall_customer_refund_requests_create(
        customerConnection,
        {},
      );
    typia.assert(refundRequest);
    createdRefundRequests.push(refundRequest);
  }
  // 3. Test Case 1: First page with minimal limit (page=1, limit=1)
  const firstPageResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page data length",
    firstPageResponse.data.length,
    1,
  );
  TestValidator.predicate(
    "first page has valid pagination",
    firstPageResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page limit is 1",
    firstPageResponse.pagination.limit === 1,
  );
  TestValidator.predicate(
    "total records is 3",
    firstPageResponse.pagination.records === refundRequestCount,
  );
  // 4. Test Case 2: High page number that exceeds total results to test empty response
  const highPageResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(highPageResponse);
  TestValidator.equals(
    "high page data is empty",
    highPageResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "high page total records still reflects actual total",
    highPageResponse.pagination.records === refundRequestCount,
  );
  TestValidator.predicate(
    "high page current is 100",
    highPageResponse.pagination.current === 100,
  );
  // 5. Test Case 3: Verify total count is consistent across different page requests
  const secondPageResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Verify pagination metadata consistency across different page requests
  TestValidator.equals(
    "total records consistent across pages",
    firstPageResponse.pagination.records,
    secondPageResponse.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent across requests",
    firstPageResponse.pagination.pages,
    highPageResponse.pagination.pages,
  );
  // Verify correct data on second page
  TestValidator.equals(
    "second page data length with limit 1",
    secondPageResponse.data.length,
    1,
  );
  TestValidator.predicate(
    "second page current is 2",
    secondPageResponse.pagination.current === 2,
  );
  // 6. Validate pagination calculations
  const expectedTotalPages = Math.ceil(refundRequestCount / 1); // With limit=1, should have 3 pages
  TestValidator.equals(
    "calculated total pages matches",
    firstPageResponse.pagination.pages,
    expectedTotalPages,
  );
}