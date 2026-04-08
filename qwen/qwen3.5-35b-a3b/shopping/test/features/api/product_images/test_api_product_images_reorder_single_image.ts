import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_images_reorder_single_image(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerName = RandomGenerator.name();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: sellerName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Step 2: Reorder single image (product has only one image with display_order=1)
  const productUuid = typia.random<string & tags.Format<"uuid">>();
  const response: IEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.seller.products.images.patchByProductid(
      sellerConnection,
      {
        productId: productUuid,
        body: {
          display_order: 1,
        } satisfies IEcommerceMallProductImage.IReorder,
      },
    );
  typia.assert(response);
  // Step 3: Validate response
  TestValidator.equals("display_order is 1", response.display_order, 1);
}
