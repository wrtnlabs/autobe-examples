import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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

export async function test_api_product_variant_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformProductVariantSnapshot.IRequest;
  const productId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.seller.products.variantSnapshots.index(
      sellerConnection,
      {
        productId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page should be reflected in pagination metadata",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit should be reflected in pagination metadata",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "variant snapshot history should be returned as a page",
    () =>
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0 &&
      output.data.length <= request.limit!,
  );
  TestValidator.predicate(
    "returned snapshots should be ordered newest first by default",
    () =>
      output.data.every(
        (snapshot, index, array) =>
          index === 0 || array[index - 1].created_at >= snapshot.created_at,
      ),
  );
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.product);
    typia.assert(snapshot.productVariant);
    TestValidator.predicate(
      "snapshot should preserve product context for audit review",
      () =>
        typeof snapshot.product.id === "string" &&
        typeof snapshot.product.name === "string" &&
        typeof snapshot.product.description === "string",
    );
    TestValidator.predicate(
      "snapshot should preserve related variant context for audit review",
      () =>
        typeof snapshot.productVariant.id === "string" &&
        typeof snapshot.productVariant.skuCode === "string" &&
        typeof snapshot.productVariant.optionValues === "string",
    );
    TestValidator.predicate(
      "snapshot should preserve SKU code and option summary",
      () => snapshot.sku_code.length > 0 && snapshot.option_summary.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve optional price override and snapshot reason values",
      () =>
        snapshot.price_override === null ||
        typeof snapshot.price_override === "number",
    );
    TestValidator.predicate(
      "snapshot should preserve optional snapshot reason values",
      () =>
        snapshot.snapshot_reason === null ||
        typeof snapshot.snapshot_reason === "string",
    );
    TestValidator.predicate(
      "snapshot should preserve creation timestamp",
      () => snapshot.created_at.length > 0,
    );
  }
}
