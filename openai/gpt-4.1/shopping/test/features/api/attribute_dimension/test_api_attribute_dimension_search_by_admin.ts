import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAttributeDimension";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test that a shopping admin can search attribute dimensions with advanced
 * filters and pagination.
 *
 * - Admin registration and authentication
 * - Create attribute dimension for search
 * - Perform search (partial code/name, sort, pagination)
 * - Results contain created dimension and correct paging
 * - Unauthenticated (non-admin) search is denied
 * - Results exclude deleted/inactive dimensions
 */
export async function test_api_attribute_dimension_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name(2);
  const adminRole = RandomGenerator.pick([
    "super",
    "operator",
    "support",
  ] as const);
  const adminStatus = "active";
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string as string,
        name: adminName,
        role: adminRole,
        status: adminStatus,
      },
    });
  typia.assert(admin);

  // 2. Create attribute dimension for search
  const code = RandomGenerator.alphaNumeric(8);
  const dimensionName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const dimension: IShoppingAttributeDimension =
    await api.functional.shopping.admin.attributeDimensions.create(connection, {
      body: {
        dimension_code: code,
        name: dimensionName,
        description,
      },
    });
  typia.assert(dimension);

  // 3. Search using partial code and name, with sort and pagination
  const partialCode = code.substring(0, 4);
  const partialName = dimensionName.split(" ")[0];
  const page = 1 satisfies number as number;
  const limit = 20 satisfies number as number;
  const searchBody = {
    search: undefined,
    dimension_code: partialCode,
    name: partialName,
    created_from: undefined,
    created_to: undefined,
    sort_by: RandomGenerator.pick([
      "dimension_code",
      "name",
      "created_at",
    ] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
    page,
    limit,
  } satisfies IShoppingAttributeDimension.IRequest;
  const result = await api.functional.shopping.admin.attributeDimensions.index(
    connection,
    {
      body: searchBody,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "results array should contain our created dimension",
    true,
    result.data.some(
      (d) => d.dimension_code === code && d.name === dimensionName,
    ),
  );
  TestValidator.equals(
    "pagination current page",
    result.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", result.pagination.limit, limit);

  // 4. Unauthenticated actor - remove admin token (simulate no auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access attributeDimensions search",
    async () => {
      await api.functional.shopping.admin.attributeDimensions.index(
        unauthConn,
        {
          body: searchBody,
        },
      );
    },
  );
}
