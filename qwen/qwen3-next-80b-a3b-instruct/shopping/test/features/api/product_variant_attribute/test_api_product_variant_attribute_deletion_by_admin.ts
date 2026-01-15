import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a unique, valid UUID to represent an existing product variant attribute
  // In real system, this ID would exist from prior setup; here we assume it's valid
  const attributeId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the product variant attribute as administrator
  await api.functional.shoppingMall.admin.product_variants.attributes.erase(
    adminConnection,
    {
      attributeId,
    },
  );
  // Step 4: Validate deletion is permanent by attempting to delete the same attribute again
  // Should fail with error, confirming it was removed permanently
  await TestValidator.error(
    "deleting already deleted attribute should fail",
    async () => {
      await api.functional.shoppingMall.admin.product_variants.attributes.erase(
        adminConnection,
        {
          attributeId,
        },
      );
    },
  );
  // Step 5: Validate that only administrators can perform deletion — test unauthorized access
  // Create unauthenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot delete product variant attribute",
    async () => {
      await api.functional.shoppingMall.admin.product_variants.attributes.erase(
        guestConnection,
        {
          attributeId,
        },
      );
    },
  );
}
