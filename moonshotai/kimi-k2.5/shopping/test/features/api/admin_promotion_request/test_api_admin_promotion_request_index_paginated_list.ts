import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test retrieving a paginated list of all administrator promotion requests as a super administrator.
 * Verifies both customer and seller requests are returned with correct structure and pagination metadata.
 */
export async function test_api_admin_promotion_request_index_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and submit promotion request
  const customer_connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer_connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const customer_request =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customer_connection,
      {
        body: {
          reason: typia.random<
            string & tags.MinLength<10> & tags.MaxLength<1000>
          >(),
        },
      },
    );
  typia.assert(customer_request);
  // 2. Create seller and submit promotion request
  const seller_connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller_connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const seller_request =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      seller_connection,
      {
        body: {
          reason: typia.random<
            string & tags.MinLength<10> & tags.MaxLength<1000>
          >(),
        },
      },
    );
  typia.assert(seller_request);
  // 3. Authenticate as superAdmin
  const super_admin_connection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(super_admin_connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // 4. Call the endpoint with default pagination
  const response: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      super_admin_connection,
      {
        body: {
          status: null,
          requesterType: null,
          reviewed: null,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit: null,
          page: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "current page number is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is at least 2",
    response.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pages count is correct",
    response.pagination.pages >= 1,
  );
  // 6. Validate that both customer and seller requests are present
  const customer_request_found = response.data.some(
    (item) => item.id === customer_request.id,
  );
  const seller_request_found = response.data.some(
    (item) => item.id === seller_request.id,
  );
  TestValidator.predicate(
    "customer request is in the list",
    customer_request_found,
  );
  TestValidator.predicate(
    "seller request is in the list",
    seller_request_found,
  );
  // 7. Validate response structure for each item
  for (const item of response.data) {
    // Verify requester identity exists (polymorphic)
    TestValidator.predicate(
      "requester exists",
      item.requester !== null && item.requester !== undefined,
    );
    // Verify reason exists
    TestValidator.predicate(
      "reason is present",
      item.reason !== null && item.reason !== undefined,
    );
    // Verify status is pending (for unreviewed requests)
    TestValidator.equals("status is pending", item.status, "pending");
    // Verify createdAt exists
    TestValidator.predicate(
      "createdAt is present",
      item.createdAt !== null && item.createdAt !== undefined,
    );
    // Verify reviewer is null (not yet reviewed)
    TestValidator.equals("reviewer is null", item.reviewer, null);
  }
  // 8. Validate data array length is correct for page
  TestValidator.predicate(
    "data length is within limit",
    response.data.length <= response.pagination.limit,
  );
}
