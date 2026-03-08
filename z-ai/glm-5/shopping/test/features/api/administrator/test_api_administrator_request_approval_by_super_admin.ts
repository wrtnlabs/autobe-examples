import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_customer_requests_create } from "../../../generate/generate_random_shopping_mall_customer_requests_create";
import { prepare_random_shopping_mall_administrator_session } from "../../../prepare/prepare_random_shopping_mall_administrator_session";

export async function test_api_administrator_request_approval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer account who will request admin privileges
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Step 2: Customer submits an administrator request
  const adminRequest =
    await generate_random_shopping_mall_customer_requests_create(
      customerConnection,
      {},
    );
  typia.assert(adminRequest);
  // Step 3: Create a regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 4: Promote the administrator to super grade
  // Using base connection which may have elevated privileges in test environment
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      connection,
      {
        administratorId: adminAuth.id,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // Validate promotion to super grade
  TestValidator.equals("promoted to super grade", promotedAdmin.grade, "super");
  // Step 5: Super administrator reviews and approves the request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.requests.review(
      adminConnection,
      {
        requestId: adminRequest.id,
        body: {
          decision: "approved",
        } satisfies IShoppingMallAdministratorSession.IReview,
      },
    );
  typia.assert(approvedRequest);
  // Step 6: Validate the approval response
  TestValidator.equals(
    "request id matches",
    approvedRequest.id,
    adminRequest.id,
  );
  TestValidator.predicate(
    "has administrator info",
    approvedRequest.administrator !== null &&
      approvedRequest.administrator !== undefined,
  );
}
