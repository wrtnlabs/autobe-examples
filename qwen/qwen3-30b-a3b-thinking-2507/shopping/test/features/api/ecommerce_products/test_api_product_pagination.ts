import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_product_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category for filtering operations
  const categoryConnection: api.IConnection = { host: connection.host };
  const category = await generate_random_ecommerce_categories_create(
    categoryConnection,
    {
      body: {
        name: RandomGenerator.paragraph(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  // 2. Query products with pagination parameters
  const productConnection: api.IConnection = { host: connection.host };
  const page1 = await api.functional.ecommerce.products.patch(
    productConnection,
    {
      body: {
        page: 1,
        limit: 24,
        category_id: category.id,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.ecommerce.products.patch(
    productConnection,
    {
      body: {
        page: 2,
        limit: 24,
        category_id: category.id,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(page2);
  // 3. Validate pagination results
  TestValidator.equals("First page has items", page1.data.length > 0, true);
  TestValidator.equals("First page is page 1", page1.pagination.current, 1);
  TestValidator.equals("Second page is page 2", page2.pagination.current, 2);
  TestValidator.equals("Limit is 24", page1.pagination.limit, 24);
}
