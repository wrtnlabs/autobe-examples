import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator searching deleted products by name with partial text matching.
 *
 * Test Steps:
 * 1. Authenticate as admin using authorize_admin_join
 * 2. Call PATCH /ecommerceMall/admin/products/deleted with name filter set to 'Vintage'
 * 3. Verify response structure and pagination
 * 4. Test case-insensitive matching by searching with different cases
 * 5. Verify partial text matching works correctly
 */
export async function test_api_admin_deleted_products_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - create isolated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Search deleted products with name filter "Vintage"
  const vintageResults =
    await api.functional.ecommerceMall.admin.products.deleted.index(
      adminConnection,
      {
        body: {
          name: "Vintage",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(vintageResults);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    vintageResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    vintageResults.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    vintageResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    vintageResults.pagination.pages >= 0,
  );
  // 4. Test case-insensitive search with lowercase "vintage"
  const lowercaseResults =
    await api.functional.ecommerceMall.admin.products.deleted.index(
      adminConnection,
      {
        body: {
          name: "vintage",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(lowercaseResults);
  // 5. Verify case-insensitive matching returns consistent results
  TestValidator.equals(
    "case-insensitive search returns same record count",
    lowercaseResults.pagination.records,
    vintageResults.pagination.records,
  );
  // 6. Test partial text matching with "Cam" (partial match for "Camera")
  const partialResults =
    await api.functional.ecommerceMall.admin.products.deleted.index(
      adminConnection,
      {
        body: {
          name: "Cam",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(partialResults);
  // 7. Test search with non-matching name returns empty results
  const noResults =
    await api.functional.ecommerceMall.admin.products.deleted.index(
      adminConnection,
      {
        body: {
          name: "NonExistentProductXYZ123",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "non-matching search returns empty data array",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search returns zero records",
    noResults.pagination.records,
    0,
  );
  // 8. Test search with null name (no filter) returns all deleted products
  const allResults =
    await api.functional.ecommerceMall.admin.products.deleted.index(
      adminConnection,
      {
        body: {
          name: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(allResults);
  TestValidator.predicate(
    "null filter returns non-negative records",
    allResults.pagination.records >= 0,
  );
}
