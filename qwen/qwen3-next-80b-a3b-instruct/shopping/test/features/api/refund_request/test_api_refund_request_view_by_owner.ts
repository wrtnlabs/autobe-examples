import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_view_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a refund request for a delivered order item (via utility)
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 3. Fetch the refund request by ID using the customer's authenticated connection
  const retrieved =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate fields
  TestValidator.equals(
    "customer_id matches",
    retrieved.customer_id,
    customer.id,
  );
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    refundRequest.reason,
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "responded_at is null (pending)",
    retrieved.responded_at,
    null,
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof retrieved.created_at === "string" &&
      !isNaN(Date.parse(retrieved.created_at)),
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof retrieved.updated_at === "string" &&
      !isNaN(Date.parse(retrieved.updated_at)),
  );
  // 5. Validate snapshots: check version, changed_by, and order
  TestValidator.equals("snapshots array exists", !!retrieved.snapshots, true);
  const snapshots = retrieved.snapshots as IShoppingMallRefundRequestSnapshot[];
  TestValidator.equals("at least one snapshot exists", snapshots.length, 1);
  const firstSnapshot = snapshots[0];
  TestValidator.equals("first snapshot version is 1", firstSnapshot.version, 1);
  TestValidator.equals(
    "first snapshot changed_by is customer",
    firstSnapshot.changed_by,
    "customer",
  );
  TestValidator.equals(
    "first snapshot reason matches",
    firstSnapshot.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot responder_id is null",
    firstSnapshot.responder_id,
    null,
  );
  TestValidator.equals(
    "first snapshot response_reason is null",
    firstSnapshot.response_reason,
    null,
  );
  TestValidator.equals(
    "first snapshot refund_request_id matches",
    firstSnapshot.refund_request_id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "first snapshot changed_at is ISO date-time",
    typeof firstSnapshot.changed_at === "string" &&
      !isNaN(Date.parse(firstSnapshot.changed_at)),
  );
  // 6. Validate no extra properties
  const refundRequestKeys = Object.keys(refundRequest);
  const retrievedKeys = Object.keys(retrieved);
  TestValidator.equals(
    "retrieved has same keys as created",
    retrievedKeys.sort(),
    refundRequestKeys.sort(),
  );
  // Validate snapshots object structure
  const snapshotKeys = Object.keys(firstSnapshot);
  const requiredSnapshotKeys = [
    "version",
    "reason",
    "status",
    "responder_id",
    "response_reason",
    "changed_at",
    "changed_by",
    "refund_request_id",
  ] as const;
  
  // Convert readonly tuple to sorted string array for comparison
  const sortKeys = (keys: readonly string[]): string[] => [...keys].sort();
  TestValidator.equals(
    "snapshot has required keys",
    sortKeys(snapshotKeys),
    sortKeys(requiredSnapshotKeys),
  );
}