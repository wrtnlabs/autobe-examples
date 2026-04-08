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

export async function test_api_product_variant_snapshot_history_filtered_review(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const page = 1;
  const limit = 10;
  const response =
    await api.functional.mallPlatform.seller.products.variantSnapshots.index(
      sellerConnection,
      {
        productId,
        body: {
          page,
          limit,
          sort: "-createdAt",
          search: RandomGenerator.alphabets(5),
          mallPlatformProductVariantId: typia.random<
            string & tags.Format<"uuid">
          >(),
          skuCode: RandomGenerator.alphaNumeric(8),
          optionSummary: RandomGenerator.name(),
          priceOverrideMin: 0,
          priceOverrideMax: 100000,
          snapshotReason: RandomGenerator.paragraph({ sentences: 2 }),
          createdAtFrom: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(),
          createdAtTo: new Date().toISOString(),
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data is an array",
    Array.isArray(response.data),
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot references a product",
      snapshot.product.id,
      snapshot.product.id,
    );
    TestValidator.equals(
      "snapshot references a variant",
      snapshot.productVariant.id,
      snapshot.productVariant.id,
    );
    TestValidator.predicate(
      "snapshot sku code preserved",
      snapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "snapshot option summary preserved",
      snapshot.option_summary.length > 0,
    );
    TestValidator.predicate(
      "snapshot created time preserved",
      snapshot.created_at.length > 0,
    );
  }
}
