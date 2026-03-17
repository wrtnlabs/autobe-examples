import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_purchase_snapshot_option_values_empty_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProductPurchaseSnapshotOptionValue.IRequest;
  const props = {
    orderId: typia.random<string & tags.Format<"uuid">>(),
    itemId: typia.random<string & tags.Format<"uuid">>(),
    productPurchaseSnapshotId: typia.random<string & tags.Format<"uuid">>(),
    body: request,
  };
  if (connection.simulate === true) {
    const output =
      await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.optionValues.index(
        customerConnection,
        props,
      );
    typia.assert(output);
    TestValidator.equals(
      "requested page is reflected",
      output.pagination.current,
      request.page,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      output.pagination.pages >= 0,
    );
    if (output.data.length === 0) {
      TestValidator.equals("empty records count", output.pagination.records, 0);
      TestValidator.equals("empty data length", output.data.length, 0);
    }
    return;
  }
  await TestValidator.error(
    "arbitrary identifiers without fixture APIs should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.optionValues.index(
        customerConnection,
        props,
      );
    },
  );
}
