import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_cancellation_requests_pending_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query pending cancellation requests without filters
  const result =
    await api.functional.ecommerceMall.admin.cancellation_requests.pending.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // 4. Validate each cancellation request summary has required fields
  if (result.data.length > 0) {
    const firstRequest = result.data[0];
    typia.assert(firstRequest);
    // Validate cancellation request summary fields
    TestValidator.predicate("has request id", firstRequest.id !== undefined);
    TestValidator.predicate(
      "has order item id",
      firstRequest.orderItemId !== undefined,
    );
    TestValidator.predicate("has status", firstRequest.status !== undefined);
    TestValidator.predicate(
      "has requested at",
      firstRequest.requestedAt !== undefined,
    );
    // Validate nested order item
    TestValidator.predicate(
      "has order item",
      firstRequest.orderItem !== undefined,
    );
    if (firstRequest.orderItem) {
      typia.assert(firstRequest.orderItem);
      // Validate order item fields
      TestValidator.predicate(
        "order item has id",
        firstRequest.orderItem.id !== undefined,
      );
      TestValidator.predicate(
        "order item has quantity",
        firstRequest.orderItem.quantity !== undefined,
      );
      TestValidator.predicate(
        "order item has unit price",
        firstRequest.orderItem.unitPrice !== undefined,
      );
      TestValidator.predicate(
        "order item has status",
        firstRequest.orderItem.status !== undefined,
      );
      // Validate nested order
      TestValidator.predicate(
        "order item has order",
        firstRequest.orderItem.order !== undefined,
      );
      if (firstRequest.orderItem.order) {
        typia.assert(firstRequest.orderItem.order);
        TestValidator.predicate(
          "order has id",
          firstRequest.orderItem.order.id !== undefined,
        );
        TestValidator.predicate(
          "order has order number",
          firstRequest.orderItem.order.orderNumber !== undefined,
        );
        TestValidator.predicate(
          "order has status",
          firstRequest.orderItem.order.status !== undefined,
        );
        TestValidator.predicate(
          "order has total price",
          firstRequest.orderItem.order.totalPrice !== undefined,
        );
        // Validate nested customer
        TestValidator.predicate(
          "order has customer",
          firstRequest.orderItem.order.customer !== undefined,
        );
        if (firstRequest.orderItem.order.customer) {
          typia.assert(firstRequest.orderItem.order.customer);
          TestValidator.predicate(
            "customer has id",
            firstRequest.orderItem.order.customer.id !== undefined,
          );
          TestValidator.predicate(
            "customer has email",
            firstRequest.orderItem.order.customer.email !== undefined,
          );
        }
      }
      // Validate nested product variant
      TestValidator.predicate(
        "order item has product variant",
        firstRequest.orderItem.productVariant !== undefined,
      );
      if (firstRequest.orderItem.productVariant) {
        typia.assert(firstRequest.orderItem.productVariant);
        TestValidator.predicate(
          "variant has id",
          firstRequest.orderItem.productVariant.id !== undefined,
        );
        TestValidator.predicate(
          "variant has sku code",
          firstRequest.orderItem.productVariant.sku_code !== undefined,
        );
        TestValidator.predicate(
          "variant has stock quantity",
          firstRequest.orderItem.productVariant.stock_quantity !== undefined,
        );
        TestValidator.predicate(
          "variant has option values",
          firstRequest.orderItem.productVariant.option_values !== undefined,
        );
      }
    }
  }
}