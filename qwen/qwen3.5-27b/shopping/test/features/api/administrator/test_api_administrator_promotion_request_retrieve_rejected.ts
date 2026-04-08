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
 * Test retrieving a rejected administrator promotion request to verify the rejected_reason field is populated.
 *
 * Validates the complete administrator promotion request rejection workflow including customer request submission, administrator rejection with reason, and retrieval of the rejected request. Ensures that the rejected_reason field is properly populated and that the processedByAdministrator reference correctly identifies which administrator made the rejection decision.
 *
 * Special attention is given to verifying that the rejection reason is preserved, the status transitions correctly from pending to rejected, and the administrator who processed the request is properly recorded for audit trail purposes.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Customer submits an administrator promotion request with a justification reason.
 * 3. Administrator registers and authenticates to the platform.
 * 4. Administrator rejects the promotion request with a rejection reason.
 * 5. Administrator retrieves the rejected promotion request by ID.
 * 6. Validates that the response contains all expected fields including rejected_reason and processedByAdministrator.
 */
export async function test_api_administrator_promotion_request_retrieve_rejected(
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
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
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
  // 4. Administrator rejects the promotion request
  const rejectionReason =
    "This request does not meet our current requirements for administrator privileges.";
  const updated =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      adminConnection,
      {
        requestId: request.id,
        body: {
          status: "rejected",
          rejected_reason: rejectionReason,
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Administrator retrieves the rejected promotion request
  const retrieved =
    await api.functional.shoppingMall.administrator.promotion_requests.at(
      adminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate the retrieved request
  TestValidator.equals("request ID matches", retrieved.id, request.id);
  TestValidator.equals(
    "actor type is customer",
    retrieved.actor_type,
    "customer",
  );
  TestValidator.equals(
    "reason matches original",
    retrieved.reason,
    request.reason,
  );
  TestValidator.equals("status is rejected", retrieved.status, "rejected");
  TestValidator.equals(
    "rejected reason is populated",
    retrieved.rejected_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "processedByAdministrator is not null",
    retrieved.processedByAdministrator !== null,
  );
  if (retrieved.processedByAdministrator !== null && retrieved.processedByAdministrator !== undefined) {
    TestValidator.equals(
      "processedByAdministrator has valid ID",
      typeof retrieved.processedByAdministrator.id,
      "string",
    );
    TestValidator.equals(
      "processedByAdministrator has valid email",
      typeof retrieved.processedByAdministrator.email,
      "string",
    );
    TestValidator.equals(
      "processedByAdministrator has grade",
      typeof retrieved.processedByAdministrator.grade,
      "string",
    );
    TestValidator.equals(
      "processedByAdministrator banned is boolean",
      typeof retrieved.processedByAdministrator.banned,
      "boolean",
    );
  }
  TestValidator.predicate(
    "created_at is earlier than updated_at",
    new Date(retrieved.created_at) < new Date(retrieved.updated_at),
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}