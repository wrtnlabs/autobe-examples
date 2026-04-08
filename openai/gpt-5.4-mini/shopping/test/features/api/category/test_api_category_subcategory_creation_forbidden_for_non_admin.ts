import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_administrator_categories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_create";
import { generate_random_mall_platform_administrator_categories_subcategories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_subcategories_create";
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

/**
 * Verify that non-administrator users cannot create direct subcategories.
 *
 * This test prepares a valid parent category with an administrator account, then
 * authenticates a customer account and attempts to create a subcategory through
 * the administrator-only endpoint. It validates that category management remains
 * restricted to administrators and that unauthorized callers are rejected.
 *
 * 1. Administrator registers and creates a top-level parent category.
 * 2. Customer registers and authenticates with a separate connection.
 * 3. Customer attempts to create a direct subcategory under the administrator's category.
 * 4. Assert that the request is forbidden and no subcategory is created.
 */
export async function test_api_category_subcategory_creation_forbidden_for_non_admin(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const parentCategory =
    await api.functional.mallPlatform.administrator.categories.create(
      administratorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.httpError(
    "non-administrator cannot create a direct subcategory",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.categories.subcategories.create(
        customerConnection,
        {
          categoryId: parentCategory.id,
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformCategory.ICreate,
        },
      );
    },
  );
}
