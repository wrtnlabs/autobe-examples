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
 * Test filtering administrator promotion requests by status to retrieve only pending requests.
 *
 * 1. Authenticate as superAdmin to access the admin promotion requests endpoint
 * 2. Create a customer and submit a promotion request (creates pending status)
 * 3. Create a seller and submit a promotion request (creates pending status)
 * 4. Call the index endpoint with status='pending' and reviewed=false filters
 * 5. Validate that all returned records have status='pending' and reviewer=null
 * 6. Verify pagination metadata is correct
 * 7. Confirm both created requests appear in the filtered results
 */
export async function test_api_admin_promotion_request_index_filter_by_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create customer and submit a promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const customerRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {},
    );
  typia.assert(customerRequest);
  // 3. Create seller and submit a promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(sellerRequest);
  // 4. Call the index endpoint with status='pending' and reviewed=false filters
  const result =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          requesterType: null,
          reviewed: false,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(result);
  // 5. Validate that all returned records have status='pending' and reviewer=null
  for (const item of result.data) {
    TestValidator.equals("status is pending", item.status, "pending");
    TestValidator.equals("reviewer is null", item.reviewer, null);
  }
  // 6. Verify pagination metadata reflects pending requests
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.predicate("records count >= 2", result.pagination.records >= 2);
  TestValidator.predicate("data length >= 2", result.data.length >= 2);
  // 7. Confirm both created requests appear in the filtered results
  const requestIds = result.data.map((item) => item.id);
  TestValidator.predicate(
    "customer request appears in results",
    requestIds.includes(customerRequest.id),
  );
  TestValidator.predicate(
    "seller request appears in results",
    requestIds.includes(sellerRequest.id),
  );
}
