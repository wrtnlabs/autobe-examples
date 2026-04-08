import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_product_overview_basic_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call product overview endpoint with default filters (empty body)
  const overview = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: {} satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(overview);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    overview.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    overview.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    overview.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    overview.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records matches data length",
    overview.pagination.records === overview.data.length,
  );
  TestValidator.predicate(
    "pages calculation is valid",
    overview.pagination.pages ===
      (overview.pagination.limit > 0
        ? Math.ceil(overview.pagination.records / overview.pagination.limit)
        : 0),
  );
  // 4. Validate each product summary has required fields
  for (const product of overview.data) {
    typia.assert(product);
    // Verify product name is non-empty
    TestValidator.predicate(
      "product name is non-empty",
      product.name.length > 0,
    );
    // Verify base_price is positive
    TestValidator.predicate(
      "product base_price is positive",
      product.base_price > 0,
    );
    // Verify only active products (deleted_at IS NULL)
    TestValidator.predicate(
      "product is active (deleted_at is null)",
      product.deleted_at === null,
    );
    // Verify seller shop_name is non-empty
    TestValidator.predicate(
      "seller shop_name is non-empty",
      product.seller.shop_name.length > 0,
    );
    // Verify category name is non-empty
    TestValidator.predicate(
      "category name is non-empty",
      product.category.name.length > 0,
    );
    // Verify average_rating is either null or valid range (0-5)
    if (product.average_rating !== null) {
      TestValidator.predicate(
        "average_rating is between 0 and 5",
        product.average_rating >= 0 && product.average_rating <= 5,
      );
    }
    // Verify stock_status is defined
    TestValidator.predicate(
      "stock_status is defined",
      product.stock_status.length > 0,
    );
  }
}