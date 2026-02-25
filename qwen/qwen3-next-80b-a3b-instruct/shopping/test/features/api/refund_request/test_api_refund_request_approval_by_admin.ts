import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_approval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Create customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customer);
  // Create refund request via customer
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // Admin responds to refund request
  await api.functional.shoppingMall.admin.refund_requests.respond(
    adminConnection,
    {
      requestId: refundRequest.id,
      body: {
        action: "approve",
        reason: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IShoppingMallRefundRequest.IRespond,
    },
  );
  // Get the updated refund request
  const updatedRefundRequest =
    await api.functional.shoppingMall.customer.refund_requests.create(
      adminConnection,
      {
        body: {
          order_item_id: refundRequest.order_item_id,
          reason: refundRequest.reason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(updatedRefundRequest);
  TestValidator.equals(
    "refund request status is approved",
    updatedRefundRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "responded_at is set",
    updatedRefundRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "responder_id is admin",
    updatedRefundRequest.responder_id,
    admin.admin_id,
  );
  TestValidator.predicate(
    "has snapshots",
    () =>
      updatedRefundRequest.snapshots !== undefined &&
      updatedRefundRequest.snapshots!.length > 0,
  );
  if (
    updatedRefundRequest.snapshots &&
    updatedRefundRequest.snapshots.length > 0
  ) {
    const lastSnapshot =
      updatedRefundRequest.snapshots[updatedRefundRequest.snapshots.length - 1];
    TestValidator.equals(
      "last snapshot status is approved",
      lastSnapshot.status,
      "approved",
    );
    TestValidator.equals(
      "last snapshot changed_by is admin",
      lastSnapshot.changed_by,
      "admin",
    );
    TestValidator.equals(
      "last snapshot responder_id matches admin",
      lastSnapshot.responder_id,
      admin.admin_id,
    );
    TestValidator.predicate(
      "changed_at is valid timestamp",
      () =>
        new Date(lastSnapshot.changed_at).toISOString() ===
        lastSnapshot.changed_at,
    );
  }
}
