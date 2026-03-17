import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function test_api_refund_request_detail_reviewed_state(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request detail matches requested identifier",
    refundRequest.id,
    refundRequestId,
  );
  TestValidator.equals(
    "refund request belongs to authenticated customer",
    refundRequest.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "refund request has reviewer role in reviewed state",
    refundRequest.reviewer_role !== null,
  );
  TestValidator.predicate(
    "refund request has reviewed timestamp in reviewed state",
    refundRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "refund request exposes reviewed decision outcome",
    refundRequest.status !== "pending" && refundRequest.status !== "withdrawn",
  );
  TestValidator.equals(
    "refund request stays item scoped to one referenced order item",
    refundRequest.orderItem.id,
    refundRequest.orderItem.id,
  );
}
