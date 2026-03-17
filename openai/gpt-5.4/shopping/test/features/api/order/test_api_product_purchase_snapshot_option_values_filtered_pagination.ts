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

export async function test_api_product_purchase_snapshot_option_values_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const productPurchaseSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  const byOptionName = {
    option_name: RandomGenerator.alphabets(3),
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallProductPurchaseSnapshotOptionValue.IRequest;
  await TestValidator.error(
    "rejects filtered pagination query by option name for non-existent snapshot context",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.optionValues.index(
        customerConnection,
        {
          orderId,
          itemId,
          productPurchaseSnapshotId,
          body: byOptionName,
        },
      );
    },
  );
  const byOptionValue = {
    option_value: RandomGenerator.alphabets(3),
    page: 2 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallProductPurchaseSnapshotOptionValue.IRequest;
  await TestValidator.error(
    "rejects filtered pagination query by option value without sort for non-existent snapshot context",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.optionValues.index(
        customerConnection,
        {
          orderId,
          itemId,
          productPurchaseSnapshotId,
          body: byOptionValue,
        },
      );
    },
  );
}
