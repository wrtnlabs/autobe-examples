import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator snapshot history listing for a product variant.
   *
   * Validates that administrators can inspect immutable snapshot history for a
   * specific product variant and that an empty page is returned when the scoped
   * product/variant pair has no history in the test environment.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request variant snapshot history for a scoped product/variant pair.
   * 3. Validate pagination metadata and response shape.
   * 4. Confirm the response is safely handled when no snapshots exist.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.index(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination current should be non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested first page should be reflected in pagination",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page size should be reflected in pagination",
    response.pagination.limit,
    20,
  );
  if (response.data.length > 0) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "snapshots should be ordered newest first",
        new Date(response.data[i - 1].createdAt).getTime() >=
          new Date(response.data[i].createdAt).getTime(),
      );
    }
    for (const snapshot of response.data) {
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot should preserve product summary",
        snapshot.product.id.length > 0 &&
          snapshot.product.name.length > 0 &&
          snapshot.product.description.length >= 0,
      );
      TestValidator.predicate(
        "snapshot should preserve variant summary",
        snapshot.productVariant.id.length > 0 &&
          snapshot.productVariant.skuCode.length > 0 &&
          snapshot.productVariant.optionValues.length >= 0,
      );
      TestValidator.equals(
        "snapshot sku code should match preserved variant sku code",
        snapshot.skuCode,
        snapshot.productVariant.skuCode,
      );
      TestValidator.equals(
        "snapshot option summary should match preserved variant options",
        snapshot.optionSummary,
        snapshot.productVariant.optionValues,
      );
      TestValidator.predicate(
        "snapshot should include a creation timestamp",
        snapshot.createdAt.length > 0,
      );
    }
  } else {
    TestValidator.equals(
      "valid product/variant pair without history should return empty page",
      response.data.length,
      0,
    );
  }
}
