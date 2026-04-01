import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_variant_snapshot_history_scoped_by_product(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register-2",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const targetProduct =
    await generate_random_mall_platform_seller_products_create(
      seller1Connection,
      {
        body: {
          name: `Target ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: null,
          basePrice: 10000,
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(targetProduct);
  const otherProduct =
    await generate_random_mall_platform_seller_products_create(
      seller2Connection,
      {
        body: {
          name: `Other ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: null,
          basePrice: 20000,
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(otherProduct);
  const targetFirstPage =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.index(
      administratorConnection,
      {
        productId: targetProduct.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(targetFirstPage);
  const otherFirstPage =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.index(
      administratorConnection,
      {
        productId: otherProduct.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(otherFirstPage);
  TestValidator.predicate(
    "target product variant snapshots should be scoped to the requested product",
    targetFirstPage.data.every(
      (snapshot) => snapshot.product.id === targetProduct.id,
    ),
  );
  TestValidator.predicate(
    "other product variant snapshots should be scoped to the other requested product",
    otherFirstPage.data.every(
      (snapshot) => snapshot.product.id === otherProduct.id,
    ),
  );
  TestValidator.predicate(
    "target product variant snapshots should not include records from the other product",
    targetFirstPage.data.every(
      (snapshot) => snapshot.product.id !== otherProduct.id,
    ),
  );
  TestValidator.predicate(
    "other product variant snapshots should not include records from the target product",
    otherFirstPage.data.every(
      (snapshot) => snapshot.product.id !== targetProduct.id,
    ),
  );
  if (targetFirstPage.pagination.pages > 1) {
    const targetSecondPage =
      await api.functional.mallPlatform.administrator.products.variantSnapshots.index(
        administratorConnection,
        {
          productId: targetProduct.id,
          body: {
            page: 2,
            limit: 10,
          } satisfies IMallPlatformProductVariantSnapshot.IRequest,
        },
      );
    typia.assert(targetSecondPage);
    TestValidator.predicate(
      "target product second page should remain scoped to the requested product",
      targetSecondPage.data.every(
        (snapshot) => snapshot.product.id === targetProduct.id,
      ),
    );
    TestValidator.notEquals(
      "target product second page should advance pagination when more than one page exists",
      targetFirstPage.pagination.current,
      targetSecondPage.pagination.current,
    );
  }
  if (targetFirstPage.data.length > 1) {
    TestValidator.predicate(
      "target product variant snapshot history should be ordered newest first",
      targetFirstPage.data[0].createdAt >= targetFirstPage.data[1].createdAt,
    );
  }
}
