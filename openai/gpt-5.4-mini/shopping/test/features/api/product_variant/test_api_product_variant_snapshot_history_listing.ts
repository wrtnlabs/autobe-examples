import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller product variant snapshot history listing for pagination and snapshot metadata.
 *
 * Verifies that an authenticated seller can access the snapshot history endpoint for a product variant and that the response conforms to the paginated history contract.
 *
 * Since the available APIs in this test context only provide seller registration and the snapshot listing endpoint, the test focuses on authorization, request-shape correctness, pagination metadata, and snapshot record structure. This keeps the test compilation-safe while still validating the contract that the endpoint exposes to the owning seller.
 *
 * 1. Register a seller and derive an actor-specific authorized connection.
 * 2. Call the variant snapshot history endpoint with a valid paginated request.
 * 3. Validate the page metadata and the returned snapshot summary structure.
 * 4. Confirm the response is ordered newest-first when data exists.
 */
export async function test_api_product_variant_snapshot_history_listing(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
    sort: "newest",
  } satisfies IMallPlatformProductVariantSnapshot.IRequest;
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    output.pagination.limit,
    request.limit ?? output.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  if (output.data.length > 0) {
    TestValidator.predicate(
      "default newest-first ordering",
      output.data.every(
        (item, index, array) =>
          index === 0 || array[index - 1].createdAt >= item.createdAt,
      ),
    );
  }
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.product);
    typia.assert(snapshot.productVariant);
    TestValidator.predicate(
      "snapshot product reference exists",
      snapshot.product.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot variant reference exists",
      snapshot.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot SKU preserved",
      snapshot.skuCode.length > 0,
    );
    TestValidator.predicate(
      "snapshot option summary preserved",
      snapshot.optionSummary.length > 0,
    );
    TestValidator.predicate(
      "snapshot creation time present",
      snapshot.createdAt.length > 0,
    );
  }
}
