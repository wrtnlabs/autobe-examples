import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductRating";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin product rating retrieval for non-existent product.
 *
 * Validates that the admin product rating endpoint properly handles requests for products that do not exist in the system. This test ensures appropriate error handling and HTTP status code responses when attempting to retrieve rating information for invalid product identifiers.
 *
 * The test follows the authentication and error validation workflow:
 *
 * 1. Administrator account registration and authentication via authorize_admin_join
 * 2. Generation of a valid UUID format product ID that does not exist in the database
 * 3. Attempt to retrieve product rating using the non-existent product ID
 * 4. Validation that HttpError is thrown with 404 status code
 *
 * This validates the product existence check before rating calculation logic executes.
 */
export async function test_api_product_rating_non_existent_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Generate a valid UUID format but non-existent product ID
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Validate that 404 error is thrown for non-existent product
  await TestValidator.httpError(
    "non-existent product should return 404",
    404,
    async () => {
      await api.functional.ecommerce.admin.products.rating.at(adminConnection, {
        productId: nonExistentProductId,
      });
    },
  );
}
