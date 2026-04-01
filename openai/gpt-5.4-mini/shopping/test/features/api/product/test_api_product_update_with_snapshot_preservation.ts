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

export async function test_api_product_update_with_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 8,
  });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const output =
    await api.functional.mallPlatform.administrator.products.update(
      adminConnection,
      {
        productId,
        body: {
          name: updatedName,
          description: updatedDescription,
          basePrice: updatedBasePrice,
        } satisfies IMallPlatformProduct.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals("updated product name", output.name, updatedName);
  TestValidator.equals(
    "updated product description",
    output.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated product base price",
    output.basePrice,
    updatedBasePrice,
  );
  TestValidator.equals("product id preserved", output.id, productId);
  TestValidator.equals(
    "administrator identity preserved",
    authorized.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller account relation present",
    output.sellerAccount.id.length > 0,
    true,
  );
  TestValidator.predicate(
    "product timestamps are present",
    output.updatedAt >= output.createdAt,
  );
}
