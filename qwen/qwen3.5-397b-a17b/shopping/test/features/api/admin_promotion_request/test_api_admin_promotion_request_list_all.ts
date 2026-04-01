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
 * Test the primary success path where a super administrator retrieves all
 * administrator promotion requests without any filters.
 *
 * This test verifies:
 * 1. Super administrator authentication and access
 * 2. Multiple promotion requests from customers and sellers with various statuses
 * 3. List endpoint returns all requests with correct pagination
 * 4. Results are sorted by creation date descending (newest first)
 * 5. Each request summary contains all required fields
 * 6. Customer and seller submitters are correctly resolved
 */
export async function test_api_admin_promotion_request_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
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
  // 2. Create customer accounts and their promotion requests
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 3. Create seller accounts and their promotion requests
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);
  // 4. Create promotion requests from customers
  const customerRequest1 =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customer1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(customerRequest1);
  const customerRequest2 =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customer2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(customerRequest2);
  // 5. Create promotion requests from sellers
  const sellerRequest1 =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      seller1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(sellerRequest1);
  const sellerRequest2 =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      seller2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerRequest2);
  // 6. Call list endpoint with empty filter criteria
  const result =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(result);
  // 7. Validate pagination metadata
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count matches data length",
    result.pagination.records === result.data.length,
  );
  TestValidator.predicate(
    "pages count is correct",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 8. Validate we have all 4 requests
  TestValidator.equals("total requests count", result.data.length, 4);
  // 9. Validate each request has required fields (business logic only)
  for (const request of result.data) {
    TestValidator.predicate(
      "actor_type is customer or seller",
      request.actor_type === "customer" || request.actor_type === "seller",
    );
    TestValidator.predicate(
      "reason is non-empty",
      request.reason.trim().length > 0,
    );
    TestValidator.predicate(
      "status is valid",
      ["pending", "approved", "rejected"].includes(request.status),
    );
    // Validate submitter based on actor_type
    if (request.actor_type === "customer") {
      const submitter = request.submitter as IShoppingMallCustomer.ISummary;
      TestValidator.predicate(
        "customer submitter has profile or null",
        submitter.profile === null ||
          (typeof submitter.profile === "object" && submitter.profile !== null),
      );
    } else {
      const submitter = request.submitter as IShoppingMallSeller.ISummary;
      TestValidator.predicate(
        "seller submitter has approval_status",
        ["pending", "approved", "rejected"].includes(submitter.approval_status),
      );
    }
    // Validate rejection_reason is null for pending/approved requests
    if (request.status === "pending" || request.status === "approved") {
      TestValidator.equals(
        "rejection_reason is null for non-rejected",
        request.rejection_reason,
        null,
      );
    }
  }
  // 10. Validate sorting (newest first by created_at)
  for (let i = 1; i < result.data.length; i++) {
    const prevDate = new Date(result.data[i - 1].created_at).getTime();
    const currDate = new Date(result.data[i].created_at).getTime();
    TestValidator.predicate(
      `requests sorted by created_at descending at index ${i}`,
      prevDate >= currDate,
    );
  }
  // 11. Verify we have both customer and seller requests
  const customerRequests = result.data.filter(
    (r) => r.actor_type === "customer",
  );
  const sellerRequests = result.data.filter((r) => r.actor_type === "seller");
  TestValidator.predicate(
    "has at least one customer request",
    customerRequests.length >= 1,
  );
  TestValidator.predicate(
    "has at least one seller request",
    sellerRequests.length >= 1,
  );
}
