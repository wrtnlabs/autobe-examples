import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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

export async function test_api_product_snapshots_owner_history_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authenticated = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string &
        tags.Format<"email">,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!` as string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authenticated);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const firstPage =
    await api.functional.mallPlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 2,
          sort: "-createdAt",
          productId,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "first page records and pages are non-negative",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list length respects limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "snapshots are newest-first on the first page",
    firstPage.data.length <= 1 ||
      firstPage.data[0].createdAt >= firstPage.data[1].createdAt,
  );
  for (const snapshot of firstPage.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot product relation is scoped to the requested product",
      snapshot.product.id,
      productId,
    );
    TestValidator.predicate(
      "snapshot kind is recorded",
      snapshot.snapshotKind.length > 0,
    );
    TestValidator.predicate(
      "product name is preserved",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "product description is preserved",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "base price is non-negative",
      snapshot.basePrice >= 0,
    );
    TestValidator.predicate(
      "image count is non-negative",
      snapshot.imageCount >= 0,
    );
    TestValidator.predicate(
      "variant count is non-negative",
      snapshot.variantCount >= 0,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.mallPlatform.seller.products.snapshots.index(
        sellerConnection,
        {
          productId,
          body: {
            page: 2,
            limit: 2,
            sort: "-createdAt",
            productId,
          } satisfies IMallPlatformProductSnapshot.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
    TestValidator.predicate(
      "second page continues newest-first pagination",
      secondPage.data.length === 0 ||
        secondPage.data[0].createdAt <=
          firstPage.data[firstPage.data.length - 1].createdAt,
    );
  }
  const emptyPage =
    await api.functional.mallPlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {
          page: firstPage.pagination.pages + 1,
          limit: 2,
          sort: "-createdAt",
          productId,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page current",
    emptyPage.pagination.current,
    firstPage.pagination.pages + 1,
  );
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 2);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
}
