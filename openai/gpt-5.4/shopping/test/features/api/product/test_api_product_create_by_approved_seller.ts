import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_create_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const body = {
    shopping_mall_category_id: null,
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: 10000,
    status: RandomGenerator.pick(["draft", "active", "pending"] as const),
  } satisfies IShoppingMallProduct.ICreate;
  const startedAt: number = Date.now();
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body,
      },
    );
  const finishedAt: number = Date.now();
  typia.assert(product);
  TestValidator.notEquals(
    "product id should be generated independently from seller id",
    product.id,
    authorized.id,
  );
  TestValidator.equals("product name matches input", product.name, body.name);
  TestValidator.equals(
    "product description matches input",
    product.description,
    body.description,
  );
  TestValidator.equals(
    "product base price matches input",
    product.base_price,
    body.base_price,
  );
  TestValidator.equals(
    "product status matches input",
    product.status,
    body.status,
  );
  TestValidator.equals(
    "seller id derived from session",
    product.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller email derived from session",
    product.seller.email,
    authorized.email,
  );
  TestValidator.equals(
    "seller approval status derived from session",
    product.seller.approval_status,
    authorized.approval_status,
  );
  TestValidator.equals(
    "seller rejection reason derived from session",
    product.seller.rejection_reason,
    authorized.rejection_reason,
  );
  TestValidator.equals(
    "seller suspended flag derived from session",
    product.seller.suspended,
    authorized.suspended,
  );
  TestValidator.equals(
    "seller banned flag derived from session",
    product.seller.banned,
    authorized.banned,
  );
  TestValidator.equals(
    "seller deleted_at derived from session",
    product.seller.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.equals("category is null", product.category, null);
  TestValidator.equals("images start empty", product.images.length, 0);
  TestValidator.equals("variants start empty", product.variants.length, 0);
  TestValidator.equals("product deleted_at is null", product.deleted_at, null);
  const createdAtTime: number = new Date(product.created_at).getTime();
  const updatedAtTime: number = new Date(product.updated_at).getTime();
  TestValidator.predicate(
    "created_at is within creation window",
    startedAt <= createdAtTime && createdAtTime <= finishedAt,
  );
  TestValidator.predicate(
    "updated_at is within creation window",
    startedAt <= updatedAtTime && updatedAtTime <= finishedAt,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    createdAtTime <= updatedAtTime,
  );
}
