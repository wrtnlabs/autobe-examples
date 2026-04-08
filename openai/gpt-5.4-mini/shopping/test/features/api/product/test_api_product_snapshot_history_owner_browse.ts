import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_history_owner_browse(
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
  const productId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination current page should match request",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history data should be an array",
    Array.isArray(response.data),
  );
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "snapshots should be sorted by descending createdAt",
        response.data[i - 1].createdAt >= response.data[i].createdAt,
      );
    }
  }
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot id should be a UUID",
      snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot product id should be a UUID",
      snapshot.product.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot product name should be preserved",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "snapshot product description should be preserved",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot base price should be non-negative",
      snapshot.basePrice >= 0,
    );
    TestValidator.predicate(
      "snapshot image count should be non-negative",
      snapshot.imageCount >= 0,
    );
    TestValidator.predicate(
      "snapshot variant count should be non-negative",
      snapshot.variantCount >= 0,
    );
    TestValidator.predicate(
      "snapshot createdAt should not be empty",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot product timestamps should be present",
      snapshot.product.createdAt.length > 0 &&
        snapshot.product.updatedAt.length > 0,
    );
    if (snapshot.product.category !== null) {
      TestValidator.equals(
        "snapshot category name should match the preserved category name",
        snapshot.categoryName,
        snapshot.product.category.name,
      );
    }
    if (snapshot.product.category === null) {
      TestValidator.equals(
        "snapshot category name should be null when the product is uncategorized",
        snapshot.categoryName,
        null,
      );
    }
    TestValidator.predicate(
      "snapshot main image reference should be a nullable field",
      snapshot.mainImageUri === null || snapshot.mainImageUri.length > 0,
    );
  }
}
