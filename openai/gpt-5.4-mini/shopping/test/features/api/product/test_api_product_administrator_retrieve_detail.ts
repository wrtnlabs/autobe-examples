import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_administrator_retrieve_detail(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.mallPlatform.administrator.products.at(
    adminConnection,
    {
      productId,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product id should match request",
    product.id,
    productId,
  );
  TestValidator.predicate(
    "seller account should exist",
    () => product.sellerAccount.id.length > 0,
  );
  TestValidator.predicate(
    "product name should be present",
    () => product.name.length > 0,
  );
  TestValidator.predicate(
    "product description should be present",
    () => product.description.length > 0,
  );
  TestValidator.predicate(
    "base price should be non-negative",
    () => product.basePrice >= 0,
  );
  TestValidator.predicate(
    "timestamps should be ordered",
    () => product.createdAt <= product.updatedAt,
  );
  TestValidator.predicate(
    "deletedAt should be null for live product detail",
    () => product.deletedAt === null,
  );
  TestValidator.predicate(
    "category should be either null or a summary object",
    () => product.category === null || product.category.id.length > 0,
  );
}
