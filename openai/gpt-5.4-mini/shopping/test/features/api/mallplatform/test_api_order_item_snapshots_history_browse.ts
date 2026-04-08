import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshots_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.index(
      adminConnection,
      {
        body: {} satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current defaults to first page",
    output.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination is coherent with returned data size",
    output.pagination.limit === 0 ||
      output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records covers returned rows",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pagination pages is consistent with records and limit",
    output.pagination.limit === 0
      ? output.pagination.pages === 0
      : output.pagination.pages >=
          Math.ceil(output.pagination.records / output.pagination.limit),
  );
  for (let i = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      "snapshots are ordered newest first by default",
      new Date(output.data[i - 1].snapshotAt).getTime() >=
        new Date(output.data[i].snapshotAt).getTime(),
    );
  }
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot timestamp is preserved",
      snapshot.snapshotAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot reason is preserved",
      snapshot.snapshotReason.length > 0,
    );
    TestValidator.predicate(
      "order item status is preserved",
      snapshot.orderItemStatus.length > 0,
    );
    TestValidator.predicate(
      "product name is preserved",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "product description is preserved",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "product SKU is preserved",
      snapshot.productSku.length > 0,
    );
    TestValidator.predicate(
      "variant SKU code is preserved",
      snapshot.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "seller shop name is preserved",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "seller shop description is preserved",
      snapshot.sellerShopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller logo image url is preserved",
      snapshot.sellerLogoImageUrl.length > 0,
    );
    TestValidator.predicate("unit price is preserved", snapshot.unitPrice >= 0);
    TestValidator.predicate("quantity is preserved", snapshot.quantity > 0);
    TestValidator.predicate("line total is preserved", snapshot.lineTotal >= 0);
  }
}
