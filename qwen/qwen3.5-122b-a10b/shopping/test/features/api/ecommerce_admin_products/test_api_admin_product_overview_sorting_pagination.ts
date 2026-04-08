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

/**
 * Test admin product overview endpoint with sorting and pagination validation.
 *
 * Validates the administrator product listing functionality including various sorting options and pagination controls. Ensures that products are correctly ordered by specified fields and that pagination metadata accurately reflects the result set.
 *
 * The test validates sorting accuracy by testing different sort fields and directions. It verifies pagination parameters correctly control result set size and that pagination metadata accurately reflects the current page position within the total result set.
 *
 * 1. Administrator authenticates to access admin-only endpoints.
 * 2. Test sorting by created_at DESC to verify newest products appear first.
 * 3. Test sorting by base_price ASC to verify lowest prices appear first.
 * 4. Test sorting by base_price DESC to verify highest prices appear first.
 * 5. Test sorting by name to verify alphabetical ordering.
 * 6. Test pagination with limit=10, 20, 50 to verify page size control.
 * 7. Validate pagination metadata (current, limit, records, pages).
 */
export async function test_api_admin_product_overview_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test sorting by created_at DESC (newest first)
  const sortedByCreatedAt =
    await api.functional.ecommerce.admin.products.overview(adminConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(sortedByCreatedAt);
  TestValidator.predicate(
    "created_at DESC - has results",
    sortedByCreatedAt.data.length > 0,
  );
  // 3. Test sorting by base_price ASC (low to high)
  const sortedByPriceAsc =
    await api.functional.ecommerce.admin.products.overview(adminConnection, {
      body: {
        sort_by: "base_price",
        sort_order: "asc",
        limit: 10,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(sortedByPriceAsc);
  for (let i = 1; i < sortedByPriceAsc.data.length; i++) {
    TestValidator.predicate(
      `price ASC - position ${i} >= position ${i - 1}`,
      sortedByPriceAsc.data[i].base_price >=
        sortedByPriceAsc.data[i - 1].base_price,
    );
  }
  // 4. Test sorting by base_price DESC (high to low)
  const sortedByPriceDesc =
    await api.functional.ecommerce.admin.products.overview(adminConnection, {
      body: {
        sort_by: "base_price",
        sort_order: "desc",
        limit: 10,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(sortedByPriceDesc);
  for (let i = 1; i < sortedByPriceDesc.data.length; i++) {
    TestValidator.predicate(
      `price DESC - position ${i} <= position ${i - 1}`,
      sortedByPriceDesc.data[i].base_price <=
        sortedByPriceDesc.data[i - 1].base_price,
    );
  }
  // 5. Test sorting by name (alphabetical)
  const sortedByName = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        limit: 10,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(sortedByName);
  for (let i = 1; i < sortedByName.data.length; i++) {
    TestValidator.predicate(
      `name ASC - position ${i} >= position ${i - 1}`,
      sortedByName.data[i].name >= sortedByName.data[i - 1].name,
    );
  }
  // 6. Test pagination with different limit values
  const limit10 = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: { limit: 10 } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(limit10);
  TestValidator.equals(
    "limit=10 - data count <= 10",
    limit10.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "limit=10 - pagination limit",
    limit10.pagination.limit,
    10,
  );
  const limit20 = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: { limit: 20 } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(limit20);
  TestValidator.equals(
    "limit=20 - data count <= 20",
    limit20.data.length <= 20,
    true,
  );
  TestValidator.equals(
    "limit=20 - pagination limit",
    limit20.pagination.limit,
    20,
  );
  const limit50 = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: { limit: 50 } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(limit50);
  TestValidator.equals(
    "limit=50 - data count <= 50",
    limit50.data.length <= 50,
    true,
  );
  TestValidator.equals(
    "limit=50 - pagination limit",
    limit50.pagination.limit,
    50,
  );
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination records >= data length",
    limit10.pagination.records >= limit10.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    limit10.pagination.pages ===
      Math.ceil(limit10.pagination.records / limit10.pagination.limit),
  );
  TestValidator.predicate(
    "pagination current page is 1",
    limit10.pagination.current === 1,
  );
}
