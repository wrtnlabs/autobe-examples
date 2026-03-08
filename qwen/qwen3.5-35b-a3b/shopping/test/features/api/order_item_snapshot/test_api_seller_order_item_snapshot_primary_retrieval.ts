import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_item_snapshot_primary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  // 2. Setup: Create customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinResult = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResult);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginResult = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoginResult);
  // 3. List order item snapshots processed by this seller
  const listConnection: api.IConnection = { host: connection.host };
  const listResponse =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      listConnection,
      {
        body: {
          changedBySellerId: sellerJoinResult.id,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(listResponse);
  // 4. Validate list response structure
  TestValidator.equals(
    "list has pagination",
    listResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "list has valid limit",
    listResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "list has valid records count",
    listResponse.pagination.records >= 0,
  );
  // 5. If there are snapshots, retrieve one and validate its structure
  if (listResponse.data.length > 0) {
    const snapshotSummary = listResponse.data[0];
    typia.assert(snapshotSummary);
    // 6. Retrieve the specific snapshot by ID
    const detailConnection: api.IConnection = { host: connection.host };
    const detailResponse =
      await api.functional.ecommerceMall.seller.order_item_snapshots.at(
        detailConnection,
        {
          snapshotId: snapshotSummary.id,
        },
      );
    typia.assert(detailResponse);
    // 7. Validate snapshot has required fields
    TestValidator.equals(
      "snapshot has valid ID",
      detailResponse.id,
      snapshotSummary.id,
    );
    TestValidator.predicate(
      "snapshot has order item",
      detailResponse.orderItem !== null,
    );
    TestValidator.equals(
      "snapshot has changed by seller",
      detailResponse.changedBySeller.id,
      sellerJoinResult.id,
    );
    TestValidator.predicate(
      "snapshot has old status",
      typeof detailResponse.oldStatus === "string",
    );
    TestValidator.predicate(
      "snapshot has new status",
      typeof detailResponse.newStatus === "string",
    );
    TestValidator.equals(
      "snapshot has created at",
      detailResponse.createdAt,
      snapshotSummary.created_at,
    );
    // 8. Validate order item structure
    const orderItem = detailResponse.orderItem;
    typia.assert(orderItem);
    TestValidator.predicate("order item has valid ID", orderItem.id !== null);
    TestValidator.predicate(
      "order item has order reference",
      orderItem.order !== null,
    );
    TestValidator.predicate("order item has quantity", orderItem.quantity > 0);
    TestValidator.predicate(
      "order item has unit price",
      orderItem.unitPrice >= 0,
    );
    // 9. Validate seller reference
    const changedBySeller = detailResponse.changedBySeller;
    typia.assert(changedBySeller);
    TestValidator.equals(
      "seller email matches",
      changedBySeller.email,
      sellerJoinResult.email,
    );
    // 10. Validate timestamps are ISO format
    TestValidator.predicate(
      "created at is valid date-time",
      !isNaN(Date.parse(detailResponse.createdAt)),
    );
    TestValidator.predicate(
      "updated at is valid date-time",
      !isNaN(Date.parse(detailResponse.updatedAt)),
    );
    // 11. Validate change reason can be null or string
    TestValidator.predicate(
      "change reason is string or null",
      typeof detailResponse.changeReason === "string" ||
        detailResponse.changeReason === null,
    );
    // 12. Validate timestamps field
    TestValidator.predicate(
      "created at format is valid",
      detailResponse.createdAt !== null &&
        detailResponse.createdAt !== undefined,
    );
  }
}