import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

export async function test_api_product_images_invalid_uuid_format_by_admin(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  await TestValidator.error("should reject invalid UUID format", async () => {
    await api.functional.shoppingMall.admin.products.images.index(connection, {
      productId: "12345678-1234-1234-1234-12345678901", // Invalid UUID: last group has 11 chars instead of 12
      body: {} satisfies IShoppingMallProductImage.IRequest,
    });
  });
}
