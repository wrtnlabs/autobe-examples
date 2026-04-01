import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_image_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerAuthorized);
  const product = await generate_random_mall_platform_seller_products_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number>(),
      },
    },
  );
  typia.assert(product);
  const ownerSnapshots =
    await api.functional.mallPlatform.seller.products._imageSnapshots.index(
      ownerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          pageSize: 10,
          sort: "newest",
          limit: 10,
        } satisfies IMallPlatformProductImageSnapshot.IRequest,
      },
    );
  typia.assert(ownerSnapshots);
  TestValidator.equals(
    "owner snapshot pagination current page",
    ownerSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "owner snapshot pagination limit",
    ownerSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "owner snapshot results belong to the requested product",
    () =>
      ownerSnapshots.data.every(
        (snapshot) => snapshot.product.id === product.id,
      ),
  );
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuthorized = await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(intruderAuthorized);
  await TestValidator.httpError(
    "non-owner cannot access product image snapshots",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.products._imageSnapshots.index(
        intruderConnection,
        {
          productId: product.id,
          body: {
            page: 1,
            pageSize: 10,
            sort: "newest",
            limit: 10,
          } satisfies IMallPlatformProductImageSnapshot.IRequest,
        },
      );
    },
  );
}
