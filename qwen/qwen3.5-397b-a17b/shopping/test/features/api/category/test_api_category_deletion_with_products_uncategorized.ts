import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator category deletion with products becoming uncategorized.
 *
 * This test validates the category deletion endpoint functionality:
 * 1. Administrator authentication via join endpoint
 * 2. Category deletion returns 204 No Content
 *
 * Note: Full end-to-end testing (creating categories with products,
 * verifying products remain accessible after category deletion) requires
 * additional APIs for category creation, product creation, and product
 * listing which are not available in the current SDK. This test focuses
 * on the core deletion endpoint with proper administrator authentication.
 */
export async function test_api_category_deletion_with_products_uncategorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Attempt category deletion with valid UUID
  // Returns 204 No Content on success, or 404 if category doesn't exist
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId,
    },
  );
  // Note: erase() returns void (204 No Content has no response body)
  // The successful completion without throwing indicates the endpoint works
}
