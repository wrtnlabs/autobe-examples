import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_detail_view(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.mallPlatform.customer.products.at(
    customerConnection,
    {
      productId,
    },
  );
  typia.assert(product);
  TestValidator.equals("product id", product.id, productId);
  TestValidator.predicate(
    "seller account exists",
    product.sellerAccount !== null,
  );
  TestValidator.predicate(
    "category is nullable",
    product.category === null || product.category !== undefined,
  );
  TestValidator.predicate("name exists", product.name.length > 0);
  TestValidator.predicate("description exists", product.description.length > 0);
  TestValidator.predicate("base price is non-negative", product.basePrice >= 0);
  TestValidator.predicate("created at exists", product.createdAt.length > 0);
  TestValidator.predicate("updated at exists", product.updatedAt.length > 0);
  TestValidator.predicate(
    "deleted at nullable",
    product.deletedAt === null || typeof product.deletedAt === "string",
  );
}
