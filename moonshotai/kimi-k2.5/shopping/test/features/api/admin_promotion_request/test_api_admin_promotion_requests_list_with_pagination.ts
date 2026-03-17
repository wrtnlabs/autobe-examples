import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test listing administrator promotion requests with pagination.
 *
 * 1. Register a customer and create an admin promotion request
 * 2. Register a seller and create an admin promotion request
 * 3. List promotion requests with pagination using seller authentication
 * 4. Verify the paginated response contains both customer and seller requests
 * 5. Validate pagination metadata and summary structure
 */
export async function test_api_admin_promotion_requests_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create customer and submit promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const customerRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: "Customer requesting admin privileges for testing",
        },
      },
    );
  typia.assert(customerRequest);
  // Create seller and submit promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Seller requesting admin privileges for testing",
        },
      },
    );
  typia.assert(sellerRequest);
  // List promotion requests with pagination
  const listResult =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(listResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    listResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    listResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count includes both requests",
    listResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination total pages is valid",
    listResult.pagination.pages >= 1,
  );
  TestValidator.predicate("data is an array", Array.isArray(listResult.data));
  TestValidator.predicate(
    "data contains at least 2 records",
    listResult.data.length >= 2,
  );
  // Verify both requests are present in the list (polymorphic requesters)
  const foundCustomerRequest = listResult.data.some(
    (req) => req.id === customerRequest.id,
  );
  const foundSellerRequest = listResult.data.some(
    (req) => req.id === sellerRequest.id,
  );
  TestValidator.predicate(
    "list contains customer-submitted request",
    foundCustomerRequest,
  );
  TestValidator.predicate(
    "list contains seller-submitted request",
    foundSellerRequest,
  );
  // Validate summary structure of returned items
  const firstItem = listResult.data[0];
  TestValidator.predicate("item has valid id", !!firstItem.id);
  TestValidator.predicate(
    "item has valid status",
    ["pending", "approved", "rejected"].includes(firstItem.status),
  );
  TestValidator.predicate(
    "item has reason string",
    typeof firstItem.reason === "string",
  );
  TestValidator.predicate("item has createdAt", !!firstItem.createdAt);
  TestValidator.predicate("item has updatedAt", !!firstItem.updatedAt);
}
