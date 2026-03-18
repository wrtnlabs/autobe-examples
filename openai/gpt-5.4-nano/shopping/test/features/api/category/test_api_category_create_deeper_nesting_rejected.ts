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

export async function test_api_category_create_deeper_nesting_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  await authorize_admin_join(adminConnection, { body: joinBody });

  // Step A: top-level category (A)
  const topLevel = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_category_id: null,
      },
    },
  );
  typia.assert(topLevel);

  // Step B: subcategory under A (B)
  const subLevel = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_category_id: topLevel.id,
      },
    },
  );
  typia.assert(subLevel);

  // Step C (invalid): attempt to create depth 3 by nesting under B
  await TestValidator.error(
    "reject deeper nesting (depth 3) one-level constraint",
    async () => {
      try {
        await generate_random_shopping_mall_admin_categories_create(
          adminConnection,
          {
            body: {
              parent_category_id: subLevel.id,
            },
          },
        );
        throw new Error("expected category creation to be rejected");
      } catch (exp) {
        if (!typia.is<{ message: string }>(exp)) throw exp;
        const message = exp.message;
        const lower = message.toLowerCase();
        const isNestingRuleMentioned =
          lower.includes("nest") ||
          lower.includes("depth") ||
          lower.includes("one-level") ||
          lower.includes("parent") ||
          lower.includes("category placement");
        TestValidator.predicate(
          "error should mention nesting/placement constraint",
          isNestingRuleMentioned,
        );
      }
    },
  );
}
