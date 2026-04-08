import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_admin_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.products.variants.at(
      adminConnection,
      {
        productId,
        variantId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "variant id matches path parameter",
    output.id,
    variantId,
  );
  TestValidator.equals(
    "parent product id matches path parameter",
    output.product.id,
    productId,
  );
  TestValidator.predicate(
    "variant payload has a SKU code",
    output.skuCode.length > 0,
  );
  TestValidator.predicate(
    "variant payload has option values",
    output.optionValues.length > 0,
  );
  TestValidator.predicate(
    "price override is either null or non-negative",
    output.priceOverride === null || output.priceOverride >= 0,
  );
  TestValidator.equals(
    "variant is active on read",
    output.isActive,
    true as boolean,
  );
  TestValidator.predicate(
    "createdAt is populated",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is populated",
    output.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is either null or a timestamp",
    output.deletedAt === null || output.deletedAt.length > 0,
  );
  const repeated =
    await api.functional.mallPlatform.administrator.products.variants.at(
      adminConnection,
      {
        productId,
        variantId,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "repeated retrieval returns the same variant",
    repeated,
    output,
  );
}
