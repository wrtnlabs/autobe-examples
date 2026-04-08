import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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
import { generate_random_mall_platform_administrator_categories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_create";
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

export async function test_api_product_update_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoined = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoined);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.ILogin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorPassword = RandomGenerator.alphaNumeric(16);
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorJoined = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoined);
  const rootCategory =
    await generate_random_mall_platform_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(rootCategory);
  const subCategory =
    await generate_random_mall_platform_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `${RandomGenerator.name()} sub`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentCategoryId: rootCategory.id,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(subCategory);
  await TestValidator.error(
    "product update snapshot preservation requires an existing seeded product id",
    async () => {
      throw new Error(
        "No product creation or product lookup API was provided, so an existing productId cannot be prepared within this test.",
      );
    },
  );
}
