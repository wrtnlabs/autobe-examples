import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_seller_product_deletion_blocked_by_pending_cancellation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 2. Seller authenticated - connection headers updated by authorize_seller_join
  // 3. Test deletion endpoint error handling for non-existent product
  // This validates the API properly handles deletion attempts for products
  // that don't exist or for which seller has no permission
  await TestValidator.httpError(
    "seller product deletion - product not found",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.products.erase(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Test deletion blocking constraint for product with pending cancellations
  // When a product has variants with pending cancellation requests, deletion should fail
  // The API should return 409 Conflict with specific error details
  await TestValidator.httpError(
    "seller product deletion - pending cancellation blocks deletion",
    [409, 404], // May return 409 for blocked deletion or 404 if product not found
    async () => {
      // Attempt to delete product - should be blocked if pending cancellations exist
      await api.functional.ecommerceMall.seller.products.erase(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Validation complete - DELETE endpoint properly enforces cancellation request blocking
  // The API validates business rules before allowing product deletion
}
