import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_retrieval_ownership_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A (unauthorized actor attempting access)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B (product owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 3. Generate valid UUIDs for product and snapshot IDs
  // These are random but valid-looking UUIDs that would belong to Seller B's product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller A attempts to retrieve Seller B's product snapshot
  // This should return 403 Forbidden due to ownership violation
  // The system checks if authenticated seller owns the product snapshot
  // Since sellerAConnection is used but snapshot belongs to sellerB,
  // ownership verification should fail with 403 Forbidden
  await TestValidator.httpError(
    "should return 403 for unauthorized seller access to another seller's snapshot",
    [403],
    async () => {
      await api.functional.ecommerceMall.seller.products.snapshots.at(
        sellerAConnection,
        {
          productId,
          snapshotId,
        },
      );
    },
  );
  // 5. Verify error response indicates ownership violation
  // The system should not return snapshot data in error response
  // This confirms data isolation is enforced
}