import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_retrieval_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and creates authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create top-level parent category
  const parentCategory: IECommerceMallCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals("parent parent is null", parentCategory.parent, null);
  TestValidator.equals(
    "parent deleted_at is null",
    parentCategory.deleted_at,
    null,
  );
  // 3. Create subcategory under parent
  const subCategoryInput = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: parentCategory.id,
  } satisfies IECommerceMallCategory.ICreate;
  const subcategory: IECommerceMallCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: subCategoryInput,
      },
    );
  typia.assert(subcategory);
  // 4. Customer joins and creates authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Customer retrieves subcategory by ID
  const retrieved: IECommerceMallCategory =
    await api.functional.eCommerceMall.customer.categories.at(
      customerConnection,
      {
        categoryId: subcategory.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate subcategory metadata
  TestValidator.equals(
    "subcategory name",
    retrieved.name,
    subCategoryInput.name,
  );
  TestValidator.equals(
    "subcategory description",
    retrieved.description,
    subCategoryInput.description,
  );
  TestValidator.equals("subcategory id", retrieved.id, subcategory.id);
  TestValidator.equals(
    "subcategory deleted_at is null",
    retrieved.deleted_at,
    null,
  );
  // 7. Validate parent relationship
  TestValidator.predicate(
    "subcategory has non-null parent",
    () => retrieved.parent !== null,
  );
  if (retrieved.parent !== null) {
    TestValidator.equals(
      "parent id matches",
      retrieved.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "parent name matches",
      retrieved.parent.name,
      parentCategory.name,
    );
    TestValidator.equals(
      "parent description matches",
      retrieved.parent.description,
      parentCategory.description,
    );
    TestValidator.equals(
      "grandparent is null (two-level hierarchy)",
      retrieved.parent.parent,
      null,
    );
    TestValidator.equals(
      "parent deleted_at is null",
      retrieved.parent.deleted_at,
      null,
    );
  }
}
