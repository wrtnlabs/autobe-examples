import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_erase_concurrent_requests_idempotent_outcomes(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const categoryConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(categoryConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const createdCategory =
    await generate_random_shopping_mall_admin_categories_create(
      categoryConnection,
      {},
    );
  typia.assert(createdCategory);
  const concurrentConnection1: api.IConnection = { host: connection.host };
  await authorize_admin_login(concurrentConnection1, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const concurrentConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(concurrentConnection2, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const eraseTask1 = api.functional.shoppingMall.admin.categories.erase(
    concurrentConnection1,
    { categoryId: createdCategory.id },
  );
  const eraseTask2 = api.functional.shoppingMall.admin.categories.erase(
    concurrentConnection2,
    { categoryId: createdCategory.id },
  );
  await Promise.allSettled([eraseTask1, eraseTask2]).then((settled) => {
    for (const result of settled) {
      if (result.status === "rejected") {
        const reason: unknown = result.reason;
        if (!typia.is<api.HttpError>(reason)) {
          throw new Error(`Unexpected rejection reason: ${String(reason)}`);
        }
      }
    }
  });
  await api.functional.shoppingMall.admin.categories.erase(categoryConnection, {
    categoryId: createdCategory.id,
  });
}
