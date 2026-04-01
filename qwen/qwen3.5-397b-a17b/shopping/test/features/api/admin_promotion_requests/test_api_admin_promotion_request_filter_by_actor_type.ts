import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test filtering administrator promotion requests by actor type (customer vs seller).
 *
 * This test validates that the super administrator can correctly filter promotion
 * requests by submitter type. The test creates multiple promotion requests from
 * both customer and seller actors, then verifies that filtering by actor_type
 * returns only the appropriate requests with correct submitter information.
 *
 * Test flow:
 * 1. Create super administrator account and authenticate
 * 2. Create customer account and submit promotion request
 * 3. Create seller account and submit promotion request
 * 4. Filter by actor_type='customer' and verify only customer requests returned
 * 5. Filter by actor_type='seller' and verify only seller requests returned
 * 6. Verify submitter structure matches expected type for each actor
 * 7. Test pagination with actor_type filter
 * 8. Verify sorting by created_at descending
 */
export async function test_api_admin_promotion_request_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create customer account and submit promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Customer submits promotion request
  const customerRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(customerRequest);
  TestValidator.equals(
    "customer request actor_type",
    customerRequest.actor_type,
    "customer",
  );
  // 3. Create seller account and submit promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Seller submits promotion request
  const sellerRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(sellerRequest);
  TestValidator.equals(
    "seller request actor_type",
    sellerRequest.actor_type,
    "seller",
  );
  // 4. Filter by actor_type='customer' and verify only customer requests returned
  const customerFiltered =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "customer",
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(customerFiltered);
  // Verify all returned requests are from customers
  TestValidator.predicate("all filtered requests are customer type", () =>
    customerFiltered.data.every((req) => req.actor_type === "customer"),
  );
  // Verify customer request is in the results
  const customerRequestFound = customerFiltered.data.find(
    (req) => req.id === customerRequest.id,
  );
  TestValidator.predicate(
    "customer request found in filtered results",
    () => customerRequestFound !== undefined,
  );
  // Verify seller request is NOT in customer-filtered results
  const sellerRequestInCustomerFilter = customerFiltered.data.find(
    (req) => req.id === sellerRequest.id,
  );
  TestValidator.predicate(
    "seller request not in customer-filtered results",
    () => sellerRequestInCustomerFilter === undefined,
  );
  // 5. Filter by actor_type='seller' and verify only seller requests returned
  const sellerFiltered =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "seller",
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerFiltered);
  // Verify all returned requests are from sellers
  TestValidator.predicate("all filtered requests are seller type", () =>
    sellerFiltered.data.every((req) => req.actor_type === "seller"),
  );
  // Verify seller request is in the results
  const sellerRequestFound = sellerFiltered.data.find(
    (req) => req.id === sellerRequest.id,
  );
  TestValidator.predicate(
    "seller request found in filtered results",
    () => sellerRequestFound !== undefined,
  );
  // Verify customer request is NOT in seller-filtered results
  const customerRequestInSellerFilter = sellerFiltered.data.find(
    (req) => req.id === customerRequest.id,
  );
  TestValidator.predicate(
    "customer request not in seller-filtered results",
    () => customerRequestInSellerFilter === undefined,
  );
  // 6. Verify submitter structure for customer requests
  if (customerRequestFound && customerRequestFound.actor_type === "customer") {
    typia.assertGuard(customerRequestFound);
    const submitter = customerRequestFound.submitter;
    // Customer submitter should have profile with displayName and phoneNumber
    typia.assertGuard(submitter);
    TestValidator.equals(
      "customer submitter email",
      submitter.email,
      customerEmail,
    );
    if ("profile" in submitter && submitter.profile !== null) {
      TestValidator.predicate(
        "customer profile displayName is string",
        () => typeof submitter.profile!.displayName === "string",
      );
      TestValidator.predicate(
        "customer profile phoneNumber is string",
        () => typeof submitter.profile!.phoneNumber === "string",
      );
    }
  }
  // 7. Verify submitter structure for seller requests
  if (sellerRequestFound && sellerRequestFound.actor_type === "seller") {
    typia.assertGuard(sellerRequestFound);
    const submitter = sellerRequestFound.submitter;
    // Seller submitter should have approval_status
    typia.assertGuard(submitter);
    TestValidator.equals(
      "seller submitter email",
      submitter.email,
      sellerEmail,
    );
    if ("approval_status" in submitter) {
      TestValidator.predicate("seller approval_status is valid", () =>
        ["pending", "approved", "rejected"].includes(submitter.approval_status),
      );
    }
  }
  // 8. Test pagination with actor_type filter
  const customerPage2 =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "customer",
          page: 1,
          limit: 1,
          sort: "-created_at",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(customerPage2);
  TestValidator.equals(
    "pagination current page",
    customerPage2.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", customerPage2.pagination.limit, 1);
  TestValidator.predicate(
    "data length matches limit",
    () => customerPage2.data.length <= customerPage2.pagination.limit,
  );
  // 9. Verify sorting by created_at descending
  if (customerFiltered.data.length >= 2) {
    const sortedCorrectly = customerFiltered.data.every((req, index, arr) => {
      if (index === 0) return true;
      const prevDate = new Date(arr[index - 1].created_at).getTime();
      const currDate = new Date(req.created_at).getTime();
      return prevDate >= currDate;
    });
    TestValidator.predicate(
      "customer requests sorted by created_at descending",
      () => sortedCorrectly,
    );
  }
  if (sellerFiltered.data.length >= 2) {
    const sortedCorrectly = sellerFiltered.data.every((req, index, arr) => {
      if (index === 0) return true;
      const prevDate = new Date(arr[index - 1].created_at).getTime();
      const currDate = new Date(req.created_at).getTime();
      return prevDate >= currDate;
    });
    TestValidator.predicate(
      "seller requests sorted by created_at descending",
      () => sortedCorrectly,
    );
  }
}
