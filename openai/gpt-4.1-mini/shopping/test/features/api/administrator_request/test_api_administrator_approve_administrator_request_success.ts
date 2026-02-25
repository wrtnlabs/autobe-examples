import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_approve_administrator_request_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator by joining.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(adminAuthorized);
  // Use adminConnection with authorized token
  // 2. Create a new administrator request in pending status.
  const pendingRequest =
    await generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request(
      adminConnection,
      {
        body: {
          actor_type: "customer",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(pendingRequest);
  // Check initial status is pending
  TestValidator.equals(
    "initial status pending",
    pendingRequest.status,
    "pending",
  );
  // 3. Approve the created request using the requestId.
  const approvedRequest =
    await api.functional.shoppingMall.administrator.requests.approve.approveAdministratorRequest(
      adminConnection,
      {
        requestId: pendingRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 4. Verify the response shows status updated to 'approved' and timestamps are updated.
  TestValidator.equals(
    "status updated to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "updatedAt is updated",
    new Date(approvedRequest.updatedAt).getTime() >=
      new Date(pendingRequest.updatedAt).getTime(),
  );
  TestValidator.equals(
    "createdAt unchanged",
    approvedRequest.createdAt,
    pendingRequest.createdAt,
  );
  TestValidator.equals("deletedAt is null", approvedRequest.deletedAt, null);
  // 5. Confirm the approved request cannot be approved again (idempotency check).
  const approvedAgainRequest =
    await api.functional.shoppingMall.administrator.requests.approve.approveAdministratorRequest(
      adminConnection,
      {
        requestId: pendingRequest.id,
      },
    );
  typia.assert(approvedAgainRequest);
  // The status should still be 'approved' and timestamps should not change backwards.
  TestValidator.equals(
    "idempotent approve status remains approved",
    approvedAgainRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "idempotent approve updatedAt not older",
    new Date(approvedAgainRequest.updatedAt).getTime() >=
      new Date(approvedRequest.updatedAt).getTime(),
  );
}
