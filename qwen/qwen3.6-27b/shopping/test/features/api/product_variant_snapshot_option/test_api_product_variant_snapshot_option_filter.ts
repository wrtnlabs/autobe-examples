import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import type { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test product variant snapshot option filtering with case-insensitive partial matching.
 *
 * 1. Authenticates as platform administrator
 * 2. Creates filter body with key and value partial matches
 * 3. Calls the filtered endpoint
 * 4. Validates response structure
 * 5. Verifies all returned options match filter criteria using case-insensitive partial matching
 */
export async function test_api_product_variant_snapshot_option_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate random UUIDs for path parameters
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create filter criteria for case-insensitive partial matching
  const filterKey: string = "col"; // Should match "color"
  const filterValue: string = "Red"; // Should match "Red"
  // 4. Call API with filter request body
  const response =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId,
        variantId,
        snapshotId,
        body: {
          key: filterKey,
          value: filterValue,
        } satisfies IEcommercePlatformSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate all returned options match filter criteria
  await ArrayUtil.asyncForEach(response.data, async (option) => {
    TestValidator.predicate(
      "option key must include filter key (case-insensitive partial matching)",
      option.key.toLowerCase().includes(filterKey.toLowerCase()),
    );
    TestValidator.predicate(
      "option value must include filter value (case-insensitive partial matching)",
      option.value.toLowerCase().includes(filterValue.toLowerCase()),
    );
  });
}
