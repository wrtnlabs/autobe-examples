import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function test_api_refund_request_snapshot_dispute_evidence_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // 2. Create a refund request with detailed reason text for dispute evidence
  const detailedReason =
    "Product arrived significantly damaged during shipping. The box was crushed and the item inside has visible cracks and dents. This does not match the product description or images shown on the website. I am requesting a full refund as the item is unusable in its current condition.";
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: detailedReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 3. Retrieve snapshot to verify evidence preservation
  // Snapshot is created when seller approves or rejects the refund request
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate evidence preservation - the snapshot serves as immutable dispute evidence
  // Verify the snapshot preserves the exact reason text submitted by customer
  TestValidator.equals(
    "reason text preserved exactly for dispute",
    snapshot.reason,
    detailedReason,
  );
  // Verify the snapshot is correctly linked to the refund request
  TestValidator.equals(
    "refund request reference for traceability",
    snapshot.shoppingMallRefundRequestId,
    refundRequest.id,
  );
  // Verify status is valid for dispute resolution (approved/rejected by seller)
  TestValidator.predicate(
    "valid dispute resolution status",
    ["pending", "approved", "rejected"].includes(snapshot.status),
  );
  // Verify audit trail timestamp exists
  TestValidator.predicate(
    "has creation timestamp for audit trail",
    snapshot.createdAt !== null && snapshot.createdAt !== undefined,
  );
  // Verify snapshot provides complete context via parent reference
  TestValidator.predicate(
    "has parent refund request for context",
    snapshot.refundRequest !== null && snapshot.refundRequest !== undefined,
  );
}
