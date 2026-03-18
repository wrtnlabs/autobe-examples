import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_update_by_owner_creates_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string &
        tags.MinLength<1> &
        tags.Format<"password">,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const firstName = RandomGenerator.paragraph({ sentences: 2 });
  const firstDescription = RandomGenerator.paragraph({ sentences: 4 });
  const firstBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const firstUpdated = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        name: firstName,
        description: firstDescription,
        basePrice: firstBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(firstUpdated);
  TestValidator.equals("updated product id", firstUpdated.id, productId);
  TestValidator.equals("updated product name", firstUpdated.name, firstName);
  TestValidator.equals(
    "updated product description",
    firstUpdated.description,
    firstDescription,
  );
  TestValidator.equals(
    "updated product base price",
    firstUpdated.basePrice,
    firstBasePrice,
  );
  TestValidator.equals(
    "updated product seller id",
    firstUpdated.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "updated product seller email",
    firstUpdated.seller.email,
    seller.email,
  );
  const secondName = RandomGenerator.paragraph({ sentences: 3 });
  const secondDescription = RandomGenerator.paragraph({ sentences: 5 });
  const secondBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const secondUpdated =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId,
      body: {
        name: secondName,
        description: secondDescription,
        basePrice: secondBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(secondUpdated);
  TestValidator.equals(
    "second update keeps same product id",
    secondUpdated.id,
    productId,
  );
  TestValidator.equals(
    "second update changes name",
    secondUpdated.name,
    secondName,
  );
  TestValidator.equals(
    "second update changes description",
    secondUpdated.description,
    secondDescription,
  );
  TestValidator.equals(
    "second update changes base price",
    secondUpdated.basePrice,
    secondBasePrice,
  );
  TestValidator.equals(
    "second update preserves seller id",
    secondUpdated.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "second update preserves seller email",
    secondUpdated.seller.email,
    seller.email,
  );
  TestValidator.notEquals(
    "product state should change across updates",
    {
      name: firstUpdated.name,
      description: firstUpdated.description,
      basePrice: firstUpdated.basePrice,
    },
    {
      name: secondUpdated.name,
      description: secondUpdated.description,
      basePrice: secondUpdated.basePrice,
    },
  );
}
