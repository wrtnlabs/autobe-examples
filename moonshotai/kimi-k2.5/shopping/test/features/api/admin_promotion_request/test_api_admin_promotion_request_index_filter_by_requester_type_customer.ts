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

export async function test_api_admin_promotion_request_index_filter_by_requester_type_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin setup - create separate connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Customer setup - create separate connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Seller setup - create separate connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Create promotion request from customer
  const customerRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(customerRequest);
  // 5. Create promotion request from seller
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(sellerRequest);
  // 6. Filter by requesterType='customer'
  const filterQuery: IEcommerceMallAdminPromotionRequest.IRequest = {
    status: null,
    requesterType: "customer",
    reviewed: null,
    sortBy: "createdAt",
    sortOrder: "desc",
    cursor: null,
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallAdminPromotionRequest.IRequest;
  const filteredResponse: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      { body: filterQuery },
    );
  typia.assert(filteredResponse);
  // 7. Verify only customer requests are returned (no seller requests)
  // IEcommerceMallSeller has approvalStatus property, IEcommerceMallCustomer does not
  TestValidator.predicate(
    "filtered results contain only customer requests (no approvalStatus property)",
    filteredResponse.data.every(
      (record) => !("approvalStatus" in record.requester),
    ),
  );
  // 8. Verify customer request is in results
  const foundCustomerRequest = filteredResponse.data.find(
    (record) => record.id === customerRequest.id,
  );
  TestValidator.predicate(
    "customer promotion request should be in filtered results",
    foundCustomerRequest !== undefined,
  );
  // 9. Verify seller request is NOT in results
  const foundSellerRequest = filteredResponse.data.find(
    (record) => record.id === sellerRequest.id,
  );
  TestValidator.predicate(
    "seller promotion request should NOT be in filtered results",
    foundSellerRequest === undefined,
  );
  // 10. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    filteredResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    filteredResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data length <= limit",
    filteredResponse.data.length <= 10,
  );
  // 11. Test sorting by createdAt ascending
  const ascQuery: IEcommerceMallAdminPromotionRequest.IRequest = {
    status: null,
    requesterType: "customer",
    reviewed: null,
    sortBy: "createdAt",
    sortOrder: "asc",
    cursor: null,
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallAdminPromotionRequest.IRequest;
  const ascResponse: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      { body: ascQuery },
    );
  typia.assert(ascResponse);
  // Verify ascending sort order
  for (let i = 1; i < ascResponse.data.length; i++) {
    const prev = new Date(ascResponse.data[i - 1].createdAt).getTime();
    const curr = new Date(ascResponse.data[i].createdAt).getTime();
    TestValidator.predicate(
      "ascending sort: createdAt increases",
      prev <= curr,
    );
  }
  // 12. Test sorting by createdAt descending
  const descQuery: IEcommerceMallAdminPromotionRequest.IRequest = {
    status: null,
    requesterType: "customer",
    reviewed: null,
    sortBy: "createdAt",
    sortOrder: "desc",
    cursor: null,
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallAdminPromotionRequest.IRequest;
  const descResponse: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      { body: descQuery },
    );
  typia.assert(descResponse);
  // Verify descending sort order
  for (let i = 1; i < descResponse.data.length; i++) {
    const prev = new Date(descResponse.data[i - 1].createdAt).getTime();
    const curr = new Date(descResponse.data[i].createdAt).getTime();
    TestValidator.predicate(
      "descending sort: createdAt decreases",
      prev >= curr,
    );
  }
}
