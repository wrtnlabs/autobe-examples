import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_inventory_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Attempt to retrieve non-existent inventory record
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const recordId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that proper 404 error is returned for non-existent record
  await TestValidator.error(
    "should return 404 for non-existent inventory record",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.inventory.at(
        sellerConnection,
        {
          productId,
          variantId,
          recordId,
        },
      );
    },
  );
  // 4. Verify that seller was created with proper structure
  TestValidator.equals(
    "seller has approval_status",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals("seller has valid id", seller.id !== undefined, true);
  TestValidator.equals(
    "seller has valid email",
    seller.email !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has valid display_name",
    seller.display_name !== undefined,
    true,
  );
  TestValidator.predicate("seller has token", seller.token !== undefined);
  TestValidator.predicate(
    "token has access",
    seller.token.access !== undefined,
  );
  TestValidator.predicate(
    "token has refresh",
    seller.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token has expired_at",
    seller.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    seller.token.refreshable_until !== undefined,
  );
}
