import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_variant_options_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring(
      RandomGenerator.paragraph({ sentences: 4 }),
    ),
  } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest;
  const first =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.index(
      adminConnection,
      {
        orderItemSnapshotId,
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.index(
      adminConnection,
      {
        orderItemSnapshotId,
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "same pagination result on repeated browse",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "same snapshot rows on repeated browse",
    second.data,
    first.data,
  );
  TestValidator.predicate(
    "response is a page object",
    () =>
      typeof first.pagination.current === "number" &&
      typeof first.pagination.limit === "number" &&
      typeof first.pagination.records === "number" &&
      typeof first.pagination.pages === "number" &&
      Array.isArray(first.data),
  );
  TestValidator.predicate("rows belong to requested snapshot scope", () =>
    first.data.every((row) => row.orderItemSnapshot.id === orderItemSnapshotId),
  );
  TestValidator.predicate("rows preserve historical option data", () =>
    first.data.every(
      (row) => row.optionName.length > 0 && row.optionValue.length > 0,
    ),
  );
  TestValidator.predicate(
    "rows preserve parent order item snapshot reference",
    () =>
      first.data.every(
        (row) =>
          row.orderItemSnapshot.snapshotReason.length > 0 &&
          row.orderItemSnapshot.orderItem.id.length > 0 &&
          row.orderItemSnapshot.productName.length > 0,
      ),
  );
}
