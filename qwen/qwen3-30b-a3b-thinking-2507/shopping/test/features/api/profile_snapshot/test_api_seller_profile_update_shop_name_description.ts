import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_sellers_seller_profile_snapshots_create } from "../../../generate/generate_random_ecommerce_sellers_seller_profile_snapshots_create";
import { prepare_random_ecommerce_seller_profile_snapshot } from "../../../prepare/prepare_random_ecommerce_seller_profile_snapshot";

export async function test_api_seller_profile_update_shop_name_description(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Use the connection to get seller auth
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Generate random before/after values
  const beforeShopName = RandomGenerator.name();
  const beforeDescription = RandomGenerator.paragraph({ sentences: 2 });
  const afterShopName = RandomGenerator.name();
  const afterDescription = RandomGenerator.paragraph({ sentences: 2 });
  // Create snapshot using the utility function
  const snapshot =
    await generate_random_ecommerce_sellers_seller_profile_snapshots_create(
      sellerConnection,
      {
        body: {
          shop_name_before: beforeShopName,
          description_before: beforeDescription,
          shop_name_after: afterShopName,
          description_after: afterDescription,
        },
        params: {
          sellerId: sellerAuth.id,
        },
      },
    );
  typia.assert(snapshot);
  // Validate the captured values
  TestValidator.equals(
    "shop name before",
    snapshot.shop_name_before,
    beforeShopName,
  );
  TestValidator.equals(
    "shop description before",
    snapshot.description_before,
    beforeDescription,
  );
  TestValidator.equals(
    "shop name after",
    snapshot.shop_name_after,
    afterShopName,
  );
  TestValidator.equals(
    "shop description after",
    snapshot.description_after,
    afterDescription,
  );
}
