import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_order_item_snapshots_variant_options_create } from "../../../generate/generate_random_mall_platform_seller_order_item_snapshots_variant_options_create";
import { prepare_random_mall_platform_order_item_snapshot_variant_option } from "../../../prepare/prepare_random_mall_platform_order_item_snapshot_variant_option";

export async function test_api_order_item_snapshot_variant_options_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string as string &
          tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string as string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const createdRows: IMallPlatformOrderItemSnapshotVariantOption[] = [];
  for (const body of [
    { optionName: "color", optionValue: "red" },
    { optionName: "size", optionValue: "large" },
  ] satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate[]) {
    const created =
      await generate_random_mall_platform_seller_order_item_snapshots_variant_options_create(
        sellerConnection,
        {
          params: { orderItemSnapshotId },
          body,
        },
      );
    typia.assert(created);
    createdRows.push(created);
  }
  const page =
    await api.functional.mallPlatform.seller.orderItemSnapshots.variantOptions.index(
      sellerConnection,
      {
        orderItemSnapshotId,
        body: {
          page: 1,
          limit: 10,
          sort: "+optionName",
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("browse page current", page.pagination.current, 1);
  TestValidator.equals("browse page limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "browse page records include created rows",
    page.pagination.records >= createdRows.length,
  );
  TestValidator.predicate(
    "browse page pages are positive",
    page.pagination.pages >= 1,
  );
  TestValidator.equals(
    "browse row count matches created rows when page is large enough",
    page.data.length,
    createdRows.length,
  );
  TestValidator.predicate(
    "rows belong to requested snapshot",
    page.data.every((row) => row.orderItemSnapshot.id === orderItemSnapshotId),
  );
  TestValidator.predicate(
    "rows include preserved option names",
    page.data.some((row) => row.optionName === "color") &&
      page.data.some((row) => row.optionName === "size"),
  );
  TestValidator.predicate(
    "rows are stable by option name sort",
    page.data.length < 2 || page.data[0].optionName <= page.data[1].optionName,
  );
  TestValidator.predicate(
    "rows are immutable snapshots",
    page.data.every((row) =>
      createdRows.some(
        (created) =>
          created.id === row.id &&
          created.optionName === row.optionName &&
          created.optionValue === row.optionValue,
      ),
    ),
  );
}
