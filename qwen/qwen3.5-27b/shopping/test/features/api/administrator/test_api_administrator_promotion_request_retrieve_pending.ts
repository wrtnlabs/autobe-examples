import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test retrieving a pending administrator promotion request submitted by a customer.
 *
 * Validates the complete flow of creating an administrator promotion request as a customer and retrieving it as an administrator. Ensures that pending requests contain correct actor information, status, and null values for rejection-related fields.
 *
 * Special attention is given to verifying that the request correctly reflects the customer's submission and that pending status fields (rejected_reason, processedByAdministrator) are properly null before any administrative action.
 *
 * 1. Customer registers and authenticates with email and credentials.
 * 2. Customer submits an administrator promotion request with a justification reason.
 * 3. Administrator registers and authenticates with email and credentials.
 * 4. Administrator retrieves the promotion request using its ID.
 * 5. Validates request details match input and pending status requirements.
 */
export async function test_api_administrator_promotion_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Customer submits administrator promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(request);
  // 3. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Administrator retrieves the promotion request
  const retrieved =
    await api.functional.shoppingMall.administrator.promotion_requests.at(
      adminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate request details
  TestValidator.equals("request ID matches", retrieved.id, request.id);
  TestValidator.equals(
    "actor type is customer",
    retrieved.actor_type,
    "customer",
  );
  TestValidator.equals("reason matches input", retrieved.reason, reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "rejected reason is null",
    retrieved.rejected_reason,
    null,
  );
  TestValidator.equals(
    "processed by administrator is null",
    retrieved.processedByAdministrator,
    null,
  );
  TestValidator.predicate(
    "created at is present",
    retrieved.created_at !== undefined && retrieved.created_at !== null,
  );
  TestValidator.predicate(
    "updated at is present",
    retrieved.updated_at !== undefined && retrieved.updated_at !== null,
  );
  TestValidator.equals("deleted at is null", retrieved.deleted_at, null);
}
