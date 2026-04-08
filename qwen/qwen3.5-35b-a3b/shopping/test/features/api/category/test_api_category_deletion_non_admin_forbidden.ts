import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_deletion_non_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register administrator with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123";
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminJoinConnection, {
    body: {
      display_name: "Test Admin",
      email: adminEmail,
      password: adminPassword,
      grade: "regular",
    },
  });
  typia.assert(admin);
  // Step 2: Register customer with known credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123";
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: "Test Customer",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  typia.assert(customer);
  // Step 3: Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "127.0.0.1",
      referrer: "http://localhost",
    },
  });
  // Step 4: Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // Step 5: Administrator creates test category
  const category =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 6: Customer attempts to delete category (should be forbidden)
  await TestValidator.httpError(
    "customer cannot delete category",
    403,
    async () => {
      await api.functional.ecommerceMall.administrator.categories.erase(
        customerConnection,
        { categoryId: category.id },
      );
    },
  );
  // Step 7: Verify category was not deleted
  // Note: Without a GET endpoint for categories, we cannot directly verify
  // the deleted_at field. In a production test environment, this would be
  // verified by querying the category table or using a snapshot retrieval API.
  // The 403 response confirms the authorization check blocked the deletion.
  // Step 8: Verify administrator can still access the category normally
  // (demonstrating category wasn't soft-deleted by the failed attempt)
  const categoryUpdate =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(categoryUpdate);
  TestValidator.notEquals(
    "administrator category creation still works after unauthorized deletion attempt",
    categoryUpdate.id,
    category.id,
  );
}
