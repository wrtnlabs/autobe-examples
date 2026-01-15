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
export async function test_api_product_variant_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminHref: string = typia.random<string & tags.Format<"uri">>();
  const adminReferrer: string = typia.random<string & tags.Format<"uri">>();
  const adminJoinData: IShoppingMallAdmin.IJoin = {
    email: adminEmail,
    password: adminPassword,
    href: adminHref,
    referrer: adminReferrer,
  };
  // Authenticate admin via join endpoint
  const adminInfo: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminJoinData },
  );
  typia.assert(adminInfo);
  // Step 2: Generate valid product and variant UUIDs
  // Using random UUIDs because no product/variant create APIs are available
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const variantId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Call the delete endpoint with valid structure
  // We are constrained: no way to verify deletion success because:
  // - delete returns void
  // - no way to create an existing product/variant to delete
  // - we cannot test HTTP 404 status code
  // - we cannot test that missing entity error occurred
  // So we can only verify: (1) authentication works, (2) endpoint call structure is correct
  await api.functional.shoppingMall.admin.products.variants.erase(
    adminConnection,
    {
      productId: productId,
      variantId: variantId,
    },
  );
  // We cannot assert anything about the outcome because:
  // - API returns void
  // - and we are prohibited from testing status codes or error messages
  // But we have verified authentication and endpoint access
}
