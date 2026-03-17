import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_list_filter_by_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResult =
    await api.functional.ecommerceMall.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
        } satisfies IEcommerceMallSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminResult);
  // 2. Create customer accounts who will submit promotion requests
  const customerConnection1: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection1, {});
  const customerConnection2: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection2, {});
  // 3. Create seller accounts who will submit promotion requests
  const sellerConnection1: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection1, {});
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection2, {});
  // 4. Submit promotion requests from customers (creates pending status)
  const customerRequest1 =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection1,
      { body: { reason: "Customer 1 requesting admin privileges" } },
    );
  typia.assert(customerRequest1);
  TestValidator.equals(
    "customer request 1 status is pending",
    customerRequest1.status,
    "pending",
  );
  const customerRequest2 =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection2,
      { body: { reason: "Customer 2 requesting admin privileges" } },
    );
  typia.assert(customerRequest2);
  TestValidator.equals(
    "customer request 2 status is pending",
    customerRequest2.status,
    "pending",
  );
  // 5. Submit promotion requests from sellers (creates pending status)
  const sellerRequest1 =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection1,
      { body: { reason: "Seller 1 requesting admin privileges" } },
    );
  typia.assert(sellerRequest1);
  TestValidator.equals(
    "seller request 1 status is pending",
    sellerRequest1.status,
    "pending",
  );
  const sellerRequest2 =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection2,
      { body: { reason: "Seller 2 requesting admin privileges" } },
    );
  typia.assert(sellerRequest2);
  TestValidator.equals(
    "seller request 2 status is pending",
    sellerRequest2.status,
    "pending",
  );
  // 6. Filter promotion requests by pending status as super admin
  const filterRequest = {
    status: "pending",
    sort: "createdAt:desc",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdminPromotionRequest.IRequest;
  const filteredResult =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      { body: filterRequest },
    );
  typia.assert(filteredResult);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", filteredResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count is at least 4",
    filteredResult.pagination.records >= 4,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    filteredResult.pagination.pages >= 1,
  );
  // 8. Validate all returned items have pending status and null reviewer
  for (const request of filteredResult.data) {
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    TestValidator.equals(
      "reviewer is null for pending request",
      request.reviewer,
      null,
    );
  }
  // 9. Validate our created requests are included in the filtered results
  const requestIds = filteredResult.data.map((r) => r.id);
  TestValidator.predicate(
    "contains customer request 1",
    requestIds.includes(customerRequest1.id),
  );
  TestValidator.predicate(
    "contains customer request 2",
    requestIds.includes(customerRequest2.id),
  );
  TestValidator.predicate(
    "contains seller request 1",
    requestIds.includes(sellerRequest1.id),
  );
  TestValidator.predicate(
    "contains seller request 2",
    requestIds.includes(sellerRequest2.id),
  );
  // 10. Validate sorting (newest first based on createdAt desc)
  if (filteredResult.data.length >= 2) {
    for (let i = 0; i < filteredResult.data.length - 1; i++) {
      const current = new Date(filteredResult.data[i].createdAt);
      const next = new Date(filteredResult.data[i + 1].createdAt);
      TestValidator.predicate(
        `sort order descending at index ${i}`,
        current >= next,
      );
    }
  }
}
