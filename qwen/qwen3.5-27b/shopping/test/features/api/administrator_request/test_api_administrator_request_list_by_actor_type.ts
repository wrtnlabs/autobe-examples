import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test super administrator filtering administrator requests by actor type.
 *
 * Validates that the administrator request listing endpoint correctly filters requests based on the actor_type parameter. The test creates multiple administrator requests from different actor types (customers and sellers) and verifies that filtering by actor_type returns only the expected subset of requests.
 *
 * Special attention is given to ensuring that the filter correctly excludes requests from other actor types and that pagination metadata accurately reflects the filtered result count. This test ensures that super administrators can efficiently browse and manage administrator promotion requests by source type.
 *
 * 1. Super administrator registers and authenticates to access the administrator request listing endpoint.
 * 2. Two customer accounts are registered, each submitting an administrator promotion request with a justification reason.
 * 3. Two seller accounts are registered, each submitting an administrator promotion request with a justification reason.
 * 4. Super administrator filters administrator requests by actor_type = 'customer'.
 * 5. Validates that only customer requests appear in the results (exactly 2 requests).
 * 6. Verifies pagination metadata shows records=2 and pages=1.
 * 7. Confirms all returned requests have actor_type = 'customer' and no seller requests are included.
 */
export async function test_api_administrator_request_list_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. First customer registers and submits administrator request
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await generate_random_shopping_mall_customer_administrator_requests_create(
    customer1Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 3. Second customer registers and submits administrator request
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await generate_random_shopping_mall_customer_administrator_requests_create(
    customer2Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 4. First seller registers and submits administrator request
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await generate_random_shopping_mall_seller_administrator_requests_create(
    seller1Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 5. Second seller registers and submits administrator request
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await generate_random_shopping_mall_seller_administrator_requests_create(
    seller2Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 6. Super administrator filters requests by actor_type = 'customer'
  const filteredRequests =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: {
          actor_type: "customer",
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(filteredRequests);
  // 7. Validate pagination metadata shows exactly 2 customer requests
  TestValidator.equals(
    "pagination records count",
    filteredRequests.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages count",
    filteredRequests.pagination.pages,
    1,
  );
  TestValidator.equals("data array length", filteredRequests.data.length, 2);
  // 8. Verify all returned requests have actor_type = 'customer'
  for (const request of filteredRequests.data) {
    TestValidator.equals(
      `request ${request.id} actor_type is customer`,
      request.actor_type,
      "customer",
    );
  }
  // 9. Verify no seller requests are included
  const hasSellerRequests = filteredRequests.data.some(
    (request) => request.actor_type === "seller",
  );
  TestValidator.predicate(
    "no seller requests in filtered results",
    !hasSellerRequests,
  );
}
