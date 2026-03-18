import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_customer_join(ownerJoinConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
      href: "https://test.local/register" satisfies string & tags.Format<"uri">,
      referrer: "https://test.local" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(ownerAuthorized);
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: ownerAuthorized.token.access,
    },
  };
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_request_create(
      ownerConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  const snapshotCandidate: IShoppingMallRefundRequestSnapshot =
    typia.random<IShoppingMallRefundRequestSnapshot>();
  typia.assert(snapshotCandidate);
  const ownerSnapshot =
    await api.functional.shoppingMall.customer.order_items.refund_request.snapshots.at(
      ownerConnection,
      {
        orderItemId: refundRequest.orderItem.id,
        snapshotId: snapshotCandidate.id,
      },
    );
  typia.assert(ownerSnapshot);
  TestValidator.equals(
    "snapshot id should match the requested id",
    ownerSnapshot.id,
    snapshotCandidate.id,
  );
  TestValidator.equals(
    "snapshot should preserve the refund reason",
    ownerSnapshot.reason,
    snapshotCandidate.reason,
  );
  const otherJoinConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_customer_join(otherJoinConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}2@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
      href: "https://test.local/register" satisfies string & tags.Format<"uri">,
      referrer: "https://test.local" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(otherAuthorized);
  const otherConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: otherAuthorized.token.access,
    },
  };
  await TestValidator.httpError(
    "other customer cannot access the owner's refund-request snapshot",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.customer.order_items.refund_request.snapshots.at(
        otherConnection,
        {
          orderItemId: refundRequest.orderItem.id,
          snapshotId: snapshotCandidate.id,
        },
      );
    },
  );
}
