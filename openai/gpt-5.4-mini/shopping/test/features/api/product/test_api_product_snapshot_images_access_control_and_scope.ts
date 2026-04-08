import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
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

export async function test_api_product_snapshot_images_access_control_and_scope(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const anotherProduct =
    await generate_random_mall_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IMallPlatformProduct.ICreate,
      },
    );
  typia.assert(anotherProduct);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const foreignSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const firstRead =
    await api.functional.mallPlatform.administrator.products.snapshots.images.index(
      administratorConnection,
      {
        productId: product.id,
        snapshotId,
        body: {} satisfies IMallPlatformProductSnapshotImage.IRequest,
      },
    );
  typia.assert(firstRead);
  const secondRead =
    await api.functional.mallPlatform.administrator.products.snapshots.images.index(
      administratorConnection,
      {
        productId: product.id,
        snapshotId,
        body: {} satisfies IMallPlatformProductSnapshotImage.IRequest,
      },
    );
  typia.assert(secondRead);
  TestValidator.equals(
    "snapshot image reads are stable",
    secondRead,
    firstRead,
  );
  await TestValidator.error(
    "foreign snapshot scope should be rejected",
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.images.index(
        administratorConnection,
        {
          productId: product.id,
          snapshotId: foreignSnapshotId,
          body: {} satisfies IMallPlatformProductSnapshotImage.IRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "unauthorized caller should be denied snapshot image access",
    async () => {
      await api.functional.mallPlatform.administrator.products.snapshots.images.index(
        sellerConnection,
        {
          productId: anotherProduct.id,
          snapshotId,
          body: {} satisfies IMallPlatformProductSnapshotImage.IRequest,
        },
      );
    },
  );
}
