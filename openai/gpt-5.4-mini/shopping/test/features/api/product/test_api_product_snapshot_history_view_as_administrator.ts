import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
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

export async function test_api_product_snapshot_history_view_as_administrator(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    },
  });
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.ILogin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.basePrice;
  const updatedProduct =
    await api.functional.mallPlatform.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${originalName} updated`,
        description: `${originalDescription} updated`,
        basePrice: originalBasePrice + 100,
      } satisfies IMallPlatformProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  const snapshots =
    await api.functional.mallPlatform.administrator.products.snapshots.index(
      administratorConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "snapshot page current",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("snapshot page limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "snapshot history contains multiple revisions",
    snapshots.pagination.records >= 2,
  );
  TestValidator.predicate(
    "snapshot page contains data",
    snapshots.data.length >= 2,
  );
  TestValidator.predicate(
    "snapshot history is newest first",
    snapshots.data[0].createdAt >= snapshots.data[1].createdAt,
  );
  TestValidator.predicate(
    "snapshot summaries are immutable readonly data",
    snapshots.data.every(
      (snapshot) =>
        typeof snapshot.id === "string" &&
        typeof snapshot.snapshotKind === "string" &&
        typeof snapshot.productName === "string" &&
        typeof snapshot.productDescription === "string" &&
        typeof snapshot.basePrice === "number" &&
        typeof snapshot.createdAt === "string",
    ),
  );
  TestValidator.equals(
    "latest snapshot preserves updated product name",
    snapshots.data[0].productName,
    updatedProduct.name,
  );
  TestValidator.equals(
    "older snapshot preserves original product name",
    snapshots.data[snapshots.data.length - 1].productName,
    originalName,
  );
  TestValidator.equals(
    "older snapshot preserves original product description",
    snapshots.data[snapshots.data.length - 1].productDescription,
    originalDescription,
  );
  TestValidator.equals(
    "older snapshot preserves original product base price",
    snapshots.data[snapshots.data.length - 1].basePrice,
    originalBasePrice,
  );
  await api.functional.mallPlatform.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  const afterDelete =
    await api.functional.mallPlatform.administrator.products.snapshots.index(
      administratorConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(afterDelete);
  TestValidator.equals(
    "snapshot history remains available after product deletion",
    afterDelete.pagination.records,
    snapshots.pagination.records,
  );
  TestValidator.predicate(
    "snapshot history still contains preserved versions after deletion",
    afterDelete.data.length >= 2,
  );
}
