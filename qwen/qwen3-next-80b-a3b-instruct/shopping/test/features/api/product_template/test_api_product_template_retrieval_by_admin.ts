import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTemplate";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTemplate";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_template_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a product ID (since we can't create actual products, we use generated UUID)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve product templates for the product
  const result: IPageIShoppingMallProductTemplate =
    await api.functional.shoppingMall.admin.products.templates.index(
      adminConnection,
      {
        productId,
      },
    );
  typia.assert(result);
  // Step 4: Validate pagination structure using actual values from response
  const expectedPagination: IPage.IPagination = {
    current: result.pagination.current,
    limit: result.pagination.limit,
    records: result.data.length,
    pages: Math.ceil(result.data.length / result.pagination.limit),
  };
  TestValidator.equals(
    "pagination matches expected structure",
    result.pagination,
    expectedPagination,
  );
  // Step 5: Validate that templates array is correctly structured
  // Even if no templates exist, the structure should be correct
  for (const template of result.data) {
    typia.assert<IShoppingMallProductTemplate>(template);
    TestValidator.equals(
      "template has string id",
      typeof template.id,
      "string",
    );
    TestValidator.equals(
      "template has string name",
      typeof template.name,
      "string",
    );
    TestValidator.predicate(
      "template name length constraint",
      template.name.length >= 1 && template.name.length <= 100,
    );
    TestValidator.equals(
      "template has string category_id",
      typeof template.category_id,
      "string",
    );
    TestValidator.predicate(
      "template id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        template.id,
      ),
    );
    TestValidator.predicate(
      "category_id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        template.category_id,
      ),
    );
  }
}
