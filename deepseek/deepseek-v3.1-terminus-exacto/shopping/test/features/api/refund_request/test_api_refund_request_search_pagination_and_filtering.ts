import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_search_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Note: Since we cannot create refund requests directly (no API provided),
  // we'll test the search functionality with whatever data exists in the system
  // This tests the basic search and pagination functionality
  // Test basic pagination
  const basicSearch =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(basicSearch);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination structure",
    basicSearch.pagination.current >= 0 &&
      basicSearch.pagination.limit === 10 &&
      basicSearch.pagination.records >= 0 &&
      basicSearch.pagination.pages >= 0,
  );
  // Test pagination math
  if (basicSearch.pagination.records > 0) {
    const expectedPages = Math.ceil(
      basicSearch.pagination.records / basicSearch.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      basicSearch.pagination.pages,
      expectedPages,
    );
  }
  // Test text search filtering (empty search should return all results)
  const textSearch =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(textSearch);
  // Test date range filtering with current time range
  const now = new Date();
  const oneYearAgo = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateSearch =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_start: oneYearAgo,
          requested_at_end: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(dateSearch);
  // Test status filtering with null (should return all statuses)
  const statusSearch =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: null,
          page: 1,
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(statusSearch);
  // Verify summary fields structure if data exists
  if (basicSearch.data.length > 0) {
    const sampleRefund = basicSearch.data[0];
    // Validate refund request summary structure
    TestValidator.predicate(
      "refund request has required fields",
      typeof sampleRefund.id === "string" &&
        typeof sampleRefund.reason === "string" &&
        typeof sampleRefund.requested_at === "string" &&
        typeof sampleRefund.refund_window_expires_at === "string",
    );
    // Validate customer summary structure
    TestValidator.predicate(
      "customer summary has required fields",
      typeof sampleRefund.customer.id === "string" &&
        typeof sampleRefund.customer.email === "string" &&
        typeof sampleRefund.customer.display_name === "string" &&
        typeof sampleRefund.customer.created_at === "string",
    );
    // Validate seller summary structure
    TestValidator.predicate(
      "seller summary has required fields",
      typeof sampleRefund.seller.id === "string" &&
        typeof sampleRefund.seller.email === "string" &&
        typeof sampleRefund.seller.shop_name === "string" &&
        typeof sampleRefund.seller.created_at === "string",
    );
    // Verify timestamps are valid ISO strings
    TestValidator.predicate(
      "requested_at is valid ISO string",
      !isNaN(Date.parse(sampleRefund.requested_at)),
    );
    TestValidator.predicate(
      "refund_window_expires_at is valid ISO string",
      !isNaN(Date.parse(sampleRefund.refund_window_expires_at)),
    );
    TestValidator.predicate(
      "customer created_at is valid ISO string",
      !isNaN(Date.parse(sampleRefund.customer.created_at)),
    );
    TestValidator.predicate(
      "seller created_at is valid ISO string",
      !isNaN(Date.parse(sampleRefund.seller.created_at)),
    );
  }
  // Test different page numbers
  if (basicSearch.pagination.pages > 1) {
    const page2Search =
      await api.functional.ecommerce.seller.refund_requests.index(
        sellerConnection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IEcommerceRefundRequest.IRequest,
        },
      );
    typia.assert(page2Search);
    TestValidator.equals(
      "page 2 has correct page number",
      page2Search.pagination.current,
      2,
    );
  }
  // Test limit boundaries
  const maxLimitSearch =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100, // maximum allowed limit
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(maxLimitSearch);
  TestValidator.equals(
    "max limit respected",
    maxLimitSearch.pagination.limit,
    100,
  );
}
