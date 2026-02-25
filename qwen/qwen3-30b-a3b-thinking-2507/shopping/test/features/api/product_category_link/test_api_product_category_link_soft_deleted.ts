import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductCategoryLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductCategoryLink";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_category_link_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceSeller.IJoin>(),
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const categoryLink = await api.functional.ecommerce.products.categories.index(
    sellerConnection,
    {
      productId,
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  const categoryLinkId = (categoryLink as any).id;
  await TestValidator.httpError(
    "soft-deleted category link returns 404",
    404,
    async () => {
      await api.functional.ecommerce.products.categories.at(
        sellerConnection,
        {
          productId,
          categoryLinkId,
        },
      );
    },
  );
}