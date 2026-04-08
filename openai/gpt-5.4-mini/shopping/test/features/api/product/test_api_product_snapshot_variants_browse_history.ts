import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variants_browse_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator browsing preserved product snapshot variant history.
   *
   * Verifies that an administrator can browse immutable historical variant rows
   * for a product snapshot and receive preserved snapshot data suitable for
   * audit and dispute review.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request a product snapshot variant history page.
   * 3. Validate pagination metadata and preserved snapshot row fields.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.mallPlatform.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: `P@ssw0rd_${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(admin);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphabets(4),
    sort: "-createdAt",
  } satisfies IMallPlatformProductSnapshotVariant.IRequest;
  const page =
    await api.functional.mallPlatform.administrator.products.snapshots.variants.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current page is positive",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "rows do not exceed requested limit",
    page.data.length <= body.limit,
  );
  for (const row of page.data) {
    typia.assert(row);
    typia.assert(row.productSnapshot);
    TestValidator.equals(
      "row belongs to requested product snapshot",
      row.productSnapshot.id,
      snapshotId,
    );
    TestValidator.predicate("sku code is preserved", row.skuCode.length > 0);
    TestValidator.predicate(
      "option values are preserved",
      row.optionValues.length > 0,
    );
    TestValidator.predicate("createdAt is present", row.createdAt.length > 0);
    TestValidator.predicate(
      "historical availability is preserved",
      row.isAvailable === true || row.isAvailable === false,
    );
    if (row.priceOverride !== null) {
      TestValidator.predicate(
        "price override is non-negative",
        row.priceOverride >= 0,
      );
    }
    if (row.productVariantSnapshot !== null) {
      typia.assert(row.productVariantSnapshot);
      TestValidator.predicate(
        "linked variant snapshot sku is preserved",
        row.productVariantSnapshot.sku_code.length > 0,
      );
      TestValidator.predicate(
        "linked variant snapshot option summary is preserved",
        row.productVariantSnapshot.option_summary.length > 0,
      );
      if (row.productVariantSnapshot.price_override !== null) {
        TestValidator.predicate(
          "linked variant snapshot price override is non-negative",
          row.productVariantSnapshot.price_override >= 0,
        );
      }
    }
  }
}
