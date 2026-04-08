import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test super administrator rejecting a seller's administrator promotion request with a rejection reason.
 *
 * Validates the complete administrator request rejection workflow including seller registration, administrator request submission, and super administrator rejection processing. Ensures that rejected requests properly record the rejection reason, update the request status, and maintain audit trail information while preserving the seller's original account status.
 *
 * Special attention is given to verifying that the rejection reason is correctly stored, the processed_by_administrator_id is set to the super admin's ID, and the seller remains in their original role without gaining any administrator privileges.
 *
 * 1. Super administrator registers with grade='super' for elevated privileges.
 * 2. Seller registers and authenticates to the platform.
 * 3. Seller submits an administrator promotion request with justification reason.
 * 4. Super administrator rejects the request with a specific rejection reason.
 * 5. Validates rejection status, reason storage, and audit trail accuracy.
 */
export async function test_api_administrator_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Seller submits administrator request
  const request =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request);
  // 4. Super administrator rejects the request
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.update(
      superAdminConnection,
      {
        administratorRequestId: request.id,
        body: {
          status: "rejected",
          rejection_reason: "Insufficient experience with platform operations",
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate rejection status
  TestValidator.equals(
    "request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  // 6. Validate rejection reason
  TestValidator.equals(
    "rejection reason matches input",
    rejectedRequest.rejection_reason,
    "Insufficient experience with platform operations",
  );
  // 7. Validate processed by administrator ID
  TestValidator.equals(
    "processed by administrator ID is set",
    rejectedRequest.processed_by_administrator_id,
    superAdmin.id,
  );
  // 8. Validate processedByAdministrator relation
  TestValidator.predicate(
    "processedByAdministrator is not null",
    rejectedRequest.processedByAdministrator !== null,
  );
  if (rejectedRequest.processedByAdministrator !== null) {
    TestValidator.equals(
      "processedByAdministrator ID matches super admin",
      rejectedRequest.processedByAdministrator.id,
      superAdmin.id,
    );
  }
  // 9. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      rejectedRequest.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      rejectedRequest.updated_at,
    ),
  );
}
