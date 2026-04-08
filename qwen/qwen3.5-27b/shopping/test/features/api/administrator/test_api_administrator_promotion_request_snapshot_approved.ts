import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
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
 * Test administrator viewing an approved promotion request snapshot.
 *
 * Validates the complete administrator promotion request workflow including customer request submission, administrator approval, and snapshot retrieval. Ensures that snapshots are created when requests are approved and contain accurate state information.
 *
 * Special attention is given to verifying that the snapshot captures the correct user identity, request status, administrator response, and that approved requests have null response_reason.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Customer registers and authenticates.
 * 3. Customer submits an administrator promotion request with a reason.
 * 4. Administrator approves the promotion request, creating a snapshot.
 * 5. Administrator retrieves the snapshot and validates its contents.
 */
export async function test_api_administrator_promotion_request_snapshot_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
    },
  });
  typia.assert(customerAuth);
  // 3. Customer submits promotion request
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
  // 4. Administrator approves the request
  const updatedRequest =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      adminConnection,
      {
        requestId: request.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Retrieve and validate the snapshot
  // Note: The snapshot ID should be the same as the request ID in this implementation
  const snapshot =
    await api.functional.shoppingMall.administrator.promotion_requests.snapshots.at(
      adminConnection,
      {
        requestId: request.id,
        snapshotId: request.id,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot contents
  TestValidator.equals(
    "user_id matches customer",
    snapshot.user_id,
    customerAuth.id,
  );
  TestValidator.equals("user_type is customer", snapshot.user_type, "customer");
  TestValidator.equals(
    "reason matches request",
    snapshot.reason,
    request.reason,
  );
  TestValidator.equals("status is approved", snapshot.status, "approved");
  TestValidator.equals(
    "approved_by is administrator",
    snapshot.approved_by,
    adminAuth.id,
  );
  TestValidator.equals(
    "response_reason is null for approved",
    snapshot.response_reason,
    null,
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(snapshot.created_at);
    return !isNaN(date.getTime());
  });
}
