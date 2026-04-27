import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_browse_full_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create top-level category 'Electronics'
  const electronics =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
          parent_id: null,
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(electronics);
  // 3. Create subcategory 'Smartphones' under 'Electronics'
  const smartphones =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and smartphones",
          parent_id: electronics.id,
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(smartphones);
  // 4. Create top-level category 'Clothing' with no subcategories
  const clothing =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: "Apparel and fashion items",
          parent_id: null,
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(clothing);
  // 5. Browse all categories via PATCH /administrator/categories
  const page =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {} satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(page);
  // 6. Verify pagination metadata
  TestValidator.predicate(
    "records count is at least 3",
    () => page.pagination.records >= 3,
  );
  TestValidator.predicate(
    "data array has at least 3 entries",
    () => page.data.length >= 3,
  );
  // 7. Find the created categories in the response
  const electronicsFromResponse = page.data.find(
    (c) => c.name === "Electronics",
  )!;
  const clothingFromResponse = page.data.find((c) => c.name === "Clothing")!;
  TestValidator.predicate(
    "found Electronics in browse results",
    () => electronicsFromResponse !== undefined,
  );
  TestValidator.predicate(
    "found Clothing in browse results",
    () => clothingFromResponse !== undefined,
  );
  // 8. Verify Electronics has Smartphones as a subcategory
  TestValidator.predicate(
    "Electronics has subcategories",
    () => electronicsFromResponse.subcategories.length >= 1,
  );
  const hasSmartphones = electronicsFromResponse.subcategories.some(
    (sub: IECommerceMallCategory.ISummary) => sub.name === "Smartphones",
  );
  TestValidator.predicate(
    "Smartphones is a subcategory of Electronics",
    () => hasSmartphones,
  );
  // 9. Verify Clothing has empty subcategories array
  TestValidator.equals(
    "Clothing has no subcategories",
    clothingFromResponse.subcategories.length,
    0,
  );
  // 10. Verify Electronics is a top-level category (parent is null)
  TestValidator.equals(
    "Electronics parent is null",
    electronicsFromResponse.parent,
    null,
  );
  TestValidator.equals(
    "Electronics deleted_at is null",
    electronicsFromResponse.deleted_at,
    null,
  );
  // 11. Verify field completeness for a subcategory
  const smartphonesFromResponse = electronicsFromResponse.subcategories.find(
    (sub: IECommerceMallCategory.ISummary) => sub.name === "Smartphones",
  )!;
  TestValidator.predicate(
    "Smartphones has parent",
    () => smartphonesFromResponse.parent !== null,
  );
  TestValidator.equals(
    "Smartphones parent id matches Electronics",
    smartphonesFromResponse.parent!.id,
    electronics.id,
  );
  TestValidator.equals(
    "Smartphones parent name is Electronics",
    smartphonesFromResponse.parent!.name,
    "Electronics",
  );
}
