import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_snapshots_admin_search_by_product_and_shop(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate random search request — randomize query fields
  const request: IShoppingMallOrderItemSnapshot.IRequest = {
    search: typia.random<string>() ? typia.random<string>() : undefined,
    product_id: typia.random<string & tags.Format<"uuid">>() || undefined,
    variant_id: typia.random<string & tags.Format<"uuid">>() || undefined,
    seller_id: typia.random<string & tags.Format<"uuid">>() || undefined,
    customer_id: typia.random<string & tags.Format<"uuid">>() || undefined,
    created_at_from:
      typia.random<string & tags.Format<"date-time">>() || undefined,
    created_at_to:
      typia.random<string & tags.Format<"date-time">>() || undefined,
    page:
      typia.random<
        number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
      >() || undefined,
    limit:
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>
      >() || undefined,
  };
  // Call the admin endpoint for order item snapshots
  const result: IPageIShoppingMallOrderItemSnapshot.ISummary =
    await api.functional.shoppingMall.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(result);
  // Validate structure of response in its entirety
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  TestValidator.predicate("pagination structure is valid", () => {
    const p = result.pagination;
    return p.current >= 1 && p.limit >= 1 && p.records >= 0 && p.pages >= 0;
  });
  // Validate each snapshot has required properties
  result.data.forEach((snapshot) => {
    TestValidator.equals(
      "product_name is string",
      typeof snapshot.product_name,
      "string",
    );
    TestValidator.equals(
      "product_description is string",
      typeof snapshot.product_description,
      "string",
    );
    TestValidator.equals(
      "category_id is uuid",
      typeof snapshot.category_id,
      "string",
    );
    TestValidator.equals(
      "category_name is string",
      typeof snapshot.category_name,
      "string",
    );
    TestValidator.equals(
      "base_price is number",
      typeof snapshot.base_price,
      "number",
    );
    TestValidator.equals(
      "thumbnail_image_url is uri",
      typeof snapshot.thumbnail_image_url,
      "string",
    );
    TestValidator.equals(
      "all_product_images is string",
      typeof snapshot.all_product_images,
      "string",
    );
    TestValidator.equals(
      "variant_sku is string",
      typeof snapshot.variant_sku,
      "string",
    );
    TestValidator.equals(
      "variant_price is number or null",
      snapshot.variant_price === null ||
        typeof snapshot.variant_price === "number",
      true,
    );
    TestValidator.equals(
      "option_values is string",
      typeof snapshot.option_values,
      "string",
    );
    TestValidator.equals(
      "stock_at_time_of_purchase is int32",
      typeof snapshot.stock_at_time_of_purchase,
      "number",
    );
    TestValidator.equals(
      "shop_name is string",
      typeof snapshot.shop_name,
      "string",
    );
    TestValidator.equals(
      "shop_description is string or null",
      snapshot.shop_description === null ||
        typeof snapshot.shop_description === "string",
      true,
    );
    TestValidator.equals(
      "logo_image_url is uri or null",
      snapshot.logo_image_url === null ||
        (typeof snapshot.logo_image_url === "string" &&
          snapshot.logo_image_url.startsWith("http")),
      true,
    );
    TestValidator.predicate(
      "created_at is date-time",
      () => typeof snapshot.created_at === "string" &&
        snapshot.created_at.match(
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/
        ) !== null,
    );
    TestValidator.equals(
      "snapshot_hash is string",
      typeof snapshot.snapshot_hash === "string" &&
        snapshot.snapshot_hash.length > 0,
      true,
    );
  });
}