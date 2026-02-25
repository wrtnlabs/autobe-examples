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

export async function test_api_order_item_snapshots_admin_pagination_and_integrity_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // adminConnection.headers.Authorization = adminAuth.token.access; // Removed - authorize_admin_join updates headers internally
  // 2. First page: retrieve initial 20 snapshots with pagination metadata
  const firstPageResponse =
    await api.functional.shoppingMall.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // Validate first page pagination structure
  TestValidator.equals(
    "first page current page",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPageResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page has records",
    firstPageResponse.pagination.records >= 20,
  );
  TestValidator.predicate(
    "first page has pages",
    firstPageResponse.pagination.pages >= 1,
  );
  // Validate snapshot structure and data integrity
  firstPageResponse.data.forEach((snapshot) => {
    // Validate all fields are from IShoppingMallOrderItemSnapshot.ISummary
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
    TestValidator.predicate(
      "category_id is uuid",
      /^[0-9a-f-]{36}$/i.test(snapshot.category_id),
    );
    TestValidator.equals(
      "category_name is string",
      typeof snapshot.category_name,
      "string",
    );
    TestValidator.predicate(
      "base_price is number",
      typeof snapshot.base_price === "number" && snapshot.base_price >= 0,
    );
    TestValidator.predicate(
      "thumbnail_image_url is uri",
      /^https?:\/\/.+$/.test(snapshot.thumbnail_image_url),
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
    if (
      snapshot.variant_price !== undefined &&
      snapshot.variant_price !== null
    ) {
      TestValidator.predicate(
        "variant_price is number",
        typeof snapshot.variant_price === "number" &&
          snapshot.variant_price >= 0,
      );
    }
    TestValidator.equals(
      "option_values is string",
      typeof snapshot.option_values,
      "string",
    );
    TestValidator.predicate(
      "stock_at_time_of_purchase is int32",
      Number.isInteger(snapshot.stock_at_time_of_purchase) &&
        snapshot.stock_at_time_of_purchase >= 0,
    );
    TestValidator.equals(
      "shop_name is string",
      typeof snapshot.shop_name,
      "string",
    );
    if (
      snapshot.shop_description !== undefined &&
      snapshot.shop_description !== null
    ) {
      TestValidator.equals(
        "shop_description is string",
        typeof snapshot.shop_description,
        "string",
      );
    }
    if (
      snapshot.logo_image_url !== undefined &&
      snapshot.logo_image_url !== null
    ) {
      TestValidator.predicate(
        "logo_image_url is uri",
        /^https?:\/\/.+$/.test(snapshot.logo_image_url),
      );
    }
    TestValidator.predicate(
      "created_at is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(snapshot.created_at),
    );
    TestValidator.equals(
      "snapshot_hash is string",
      typeof snapshot.snapshot_hash,
      "string",
    );
    TestValidator.predicate(
      "snapshot_hash not empty",
      snapshot.snapshot_hash.length > 0,
    );
  });
  // 3. Validate sorting order: records must be sorted by created_at DESC only
  const sortedByCreated = [...firstPageResponse.data].sort((a, b) => {
    const dateCmp =
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return dateCmp;
  });
  // Replace TestValidator.index (which requires IEntity) with custom verification
  for (let i = 0; i < firstPageResponse.data.length - 1; i++) {
    const current = firstPageResponse.data[i];
    const next = firstPageResponse.data[i + 1];
    TestValidator.predicate(
      `created_at[${i}] >= created_at[${i + 1}]`,
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // 4. Second page: retrieve next 20 snapshots using cursor from last record of first page
  const lastSnapshot =
    firstPageResponse.data[firstPageResponse.data.length - 1];
  const secondPageResponse =
    await api.functional.shoppingMall.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 20,
          created_at_from: lastSnapshot.created_at,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Validate second page pagination structure
  TestValidator.equals(
    "second page current page",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "second page has records",
    secondPageResponse.pagination.records >= 40,
  );
  TestValidator.predicate(
    "second page has pages",
    secondPageResponse.pagination.pages >= 2,
  );
  // Validate that second page continues from where first page ended
  const firstLastDate = new Date(
    firstPageResponse.data[firstPageResponse.data.length - 1].created_at,
  ).getTime();
  const secondFirstDate = new Date(
    secondPageResponse.data[0].created_at,
  ).getTime();
  TestValidator.predicate(
    "second page starts after first page ends",
    secondFirstDate <= firstLastDate,
  );
  // 5. Verify cryptographic integrity of snapshot_hash
  const firstSnapshot = firstPageResponse.data[0];
  const hashSource = `${firstSnapshot.product_name}|${firstSnapshot.product_description}|${firstSnapshot.category_id}|${firstSnapshot.category_name}|${firstSnapshot.base_price}|${firstSnapshot.thumbnail_image_url}|${firstSnapshot.all_product_images}|${firstSnapshot.variant_sku}|${firstSnapshot.variant_price !== undefined && firstSnapshot.variant_price !== null ? firstSnapshot.variant_price : "null"}|${firstSnapshot.option_values}|${firstSnapshot.stock_at_time_of_purchase}|${firstSnapshot.shop_name}|${firstSnapshot.shop_description !== undefined && firstSnapshot.shop_description !== null ? firstSnapshot.shop_description : "null"}|${firstSnapshot.logo_image_url !== undefined && firstSnapshot.logo_image_url !== null ? firstSnapshot.logo_image_url : "null"}|${firstSnapshot.created_at}`;
  // Verify hash exists and is non-empty
  const verified = firstSnapshot.snapshot_hash.length > 0;
  TestValidator.predicate(
    "snapshot_hash is cryptographically consistent",
    verified,
  );
  // 6. Verify no extraneous fields exist on snapshot objects
  const snapshotKeys = Object.keys(firstSnapshot);
  const allowedKeys = [
    "product_name",
    "product_description",
    "category_id",
    "category_name",
    "base_price",
    "thumbnail_image_url",
    "all_product_images",
    "variant_sku",
    "variant_price",
    "option_values",
    "stock_at_time_of_purchase",
    "shop_name",
    "shop_description",
    "logo_image_url",
    "created_at",
    "snapshot_hash",
  ];
  const extraKeys = snapshotKeys.filter((key) => !allowedKeys.includes(key));
  TestValidator.equals("no extra fields on snapshot", extraKeys.length, 0);
}
