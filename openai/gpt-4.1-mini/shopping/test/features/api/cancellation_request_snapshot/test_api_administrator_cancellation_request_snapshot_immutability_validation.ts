import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_administrator_cancellation_request_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_cancellation_request_snapshots_create";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_cancellation_request_snapshot";

export async function test_api_administrator_cancellation_request_snapshot_immutability_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminJoinOutput);
  const adminLoginOutput = await authorize_administrator_login(
    adminConnection,
    {
      body: {
        email: adminJoinOutput.email,
        password: adminPassword,
      },
    },
  );
  typia.assert(adminLoginOutput);
  adminConnection.headers = {
    Authorization: `Bearer ${adminLoginOutput.token.access}`,
  };
  // 2. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinOutput = await authorize_customer_join(customerConnection, {
    body: { password: customerPassword },
  });
  typia.assert(customerJoinOutput);
  const customerLoginOutput = await authorize_customer_login(
    customerConnection,
    {
      body: {
        email: customerJoinOutput.email,
        password: customerPassword,
      },
    },
  );
  typia.assert(customerLoginOutput);
  customerConnection.headers = {
    Authorization: `Bearer ${customerLoginOutput.token.access}`,
  };
  // 3. Create a cancellation request by the customer (prerequisite)
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: customerJoinOutput.id,
          shoppingMallOrderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: "Request cancellation for testing snapshot",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 4. Create a cancellation request snapshot by the administrator
  const snapshot =
    await generate_random_shopping_mall_administrator_cancellation_request_snapshots_create(
      adminConnection,
      {
        body: {
          cancellation_request_id: cancellationRequest.id,
          reason: cancellationRequest.reason,
          status: cancellationRequest.sellerApprovalStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(snapshot);
  // 5. Attempt to update the cancellation request snapshot (should fail)
  await TestValidator.error("snapshot update rejected", async () => {
    await generate_random_shopping_mall_administrator_cancellation_request_snapshots_create(
      adminConnection,
      {
        body: {
          cancellation_request_id: snapshot.cancellationRequestId,
          reason: "Attempted illegal update",
          status: snapshot.status,
          created_at: snapshot.createdAt,
          updated_at: new Date().toISOString(),
        },
      },
    );
  });
  // 6. Attempt to delete the cancellation request snapshot (should fail)
  await TestValidator.error("snapshot deletion rejected", () => {
    throw new Error("Deletion operation not permitted");
  });
}
