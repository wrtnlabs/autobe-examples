import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_admin_view_all_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Create customer and seller for refund request scenario
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & (tags.MinLength<1> & tags.Format<"email">)>(),
      password: "1234",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Create order with product for refund scenario
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Get first order item for refund
  const orderItem = order.order_items[0];
  typia.assert(orderItem);
  // Create refund request as customer
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Product not as described",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Verify initial snapshot exists (created when refund request created)
  let snapshots =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(snapshots);
  // Verify at least one snapshot exists
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshots.data.length > 0,
  );
  // Verify snapshot contains required fields
  const initialSnapshot = snapshots.data[0];
  typia.assert(initialSnapshot);
  TestValidator.equals(
    "initial snapshot reason matches",
    initialSnapshot.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "initial snapshot status is pending",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot type is edit",
    initialSnapshot.snapshot_type,
    "edit",
  );
  // Verify snapshot has required timestamps
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    initialSnapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has updated_at timestamp",
    initialSnapshot.updated_at !== undefined,
  );
  // Verify pagination structure
  TestValidator.equals(
    "pagination exists",
    snapshots.pagination !== undefined,
    true,
  );
  // Verify all snapshots are of correct type
  snapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "all snapshots have correct type",
      snapshot.snapshot_type,
      "edit",
    );
    TestValidator.predicate(
      "all snapshots have reason",
      snapshot.reason !== undefined,
    );
    TestValidator.predicate(
      "all snapshots have status",
      snapshot.status !== undefined,
    );
  });
}

