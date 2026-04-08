import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_options_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator browsing of preserved product variant snapshot options.
   *
   * This scenario validates that the administrator-only snapshot options endpoint
   * supports paginated, filterable, read-only inspection of immutable historical
   * option rows using search, option key, and option value criteria.
   *
   * 1. Authenticate a dedicated administrator connection using the join utility.
   * 2. Request multiple pages from the snapshot options endpoint with different
   *    filter combinations.
   * 3. Validate pagination metadata, returned row shapes, and consistency between
   *    requested filters and the immutable historical rows returned by the API.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const pageSize = 2;
  const firstPage =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page request limit should match response limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "first page pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length should not exceed requested limit",
    firstPage.data.length <= pageSize,
  );
  TestValidator.predicate(
    "first page rows should reference the requested snapshot scope",
    firstPage.data.every(
      (row) =>
        row.productVariantSnapshot.id === snapshotId &&
        row.productVariantSnapshot.productVariant.id === variantId &&
        row.productVariantSnapshot.product.id === productId,
    ),
  );
  const filteredByOptionKey =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
        body: {
          page: 1,
          limit: 5,
          optionKey: "color",
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(filteredByOptionKey);
  TestValidator.equals(
    "filtered option key request limit should match response limit",
    filteredByOptionKey.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "filtered option key rows should not exceed requested limit",
    filteredByOptionKey.data.length <= 5,
  );
  TestValidator.predicate(
    "filtered option key rows should preserve snapshot scope",
    filteredByOptionKey.data.every(
      (row) =>
        row.productVariantSnapshot.id === snapshotId &&
        row.productVariantSnapshot.productVariant.id === variantId &&
        row.productVariantSnapshot.product.id === productId,
    ),
  );
  TestValidator.predicate(
    "filtered option key rows must satisfy the requested option key when present",
    filteredByOptionKey.data.every((row) => row.optionKey === "color"),
  );
  const filteredBySearch =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
        body: {
          page: 1,
          limit: 10,
          search: "red",
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(filteredBySearch);
  TestValidator.equals(
    "search request limit should match response limit",
    filteredBySearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "search result should not exceed requested limit",
    filteredBySearch.data.length <= 10,
  );
  TestValidator.predicate(
    "search rows should preserve snapshot scope",
    filteredBySearch.data.every(
      (row) =>
        row.productVariantSnapshot.id === snapshotId &&
        row.productVariantSnapshot.productVariant.id === variantId &&
        row.productVariantSnapshot.product.id === productId,
    ),
  );
  TestValidator.predicate(
    "search rows must satisfy the requested search term when present",
    filteredBySearch.data.every(
      (row) =>
        row.optionKey.toLowerCase().includes("red") ||
        row.optionValue.toLowerCase().includes("red"),
    ),
  );
  const filteredByOptionValue =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
        body: {
          page: 1,
          limit: 5,
          optionValue: "large",
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(filteredByOptionValue);
  TestValidator.equals(
    "filtered option value request limit should match response limit",
    filteredByOptionValue.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "filtered option value rows should not exceed requested limit",
    filteredByOptionValue.data.length <= 5,
  );
  TestValidator.predicate(
    "filtered option value rows should preserve snapshot scope",
    filteredByOptionValue.data.every(
      (row) =>
        row.productVariantSnapshot.id === snapshotId &&
        row.productVariantSnapshot.productVariant.id === variantId &&
        row.productVariantSnapshot.product.id === productId,
    ),
  );
  TestValidator.predicate(
    "filtered option value rows must satisfy the requested option value when present",
    filteredByOptionValue.data.every((row) => row.optionValue === "large"),
  );
  const secondPage =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
        body: {
          page: 2,
          limit: pageSize,
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page request limit should match response limit",
    secondPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "second page data length should not exceed requested limit",
    secondPage.data.length <= pageSize,
  );
  TestValidator.predicate(
    "second page rows should preserve snapshot scope",
    secondPage.data.every(
      (row) =>
        row.productVariantSnapshot.id === snapshotId &&
        row.productVariantSnapshot.productVariant.id === variantId &&
        row.productVariantSnapshot.product.id === productId,
    ),
  );
}
