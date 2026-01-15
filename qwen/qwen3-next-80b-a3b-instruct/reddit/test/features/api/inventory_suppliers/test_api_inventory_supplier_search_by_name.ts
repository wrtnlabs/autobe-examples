import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventorySuppliers";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_supplier_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Execute search with random parameters
  const searchRequest: ICommunityPlatformInventorySuppliers.IRequest = {
    name:
      typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>() ||
      undefined,
    region:
      typia.random<string & tags.MinLength<1> & tags.MaxLength<100>>() ||
      undefined,
    minRating:
      typia.random<number & tags.Minimum<0> & tags.Maximum<5>>() || undefined,
    complianceStatus:
      RandomGenerator.pick(["compliant", "non-compliant"] as const) ||
      undefined,
    sortBy:
      RandomGenerator.pick(["name", "rating", "created_at"] as const) ||
      undefined,
    sortDirection: RandomGenerator.pick(["asc", "desc"] as const) || undefined,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() || 1,
    limit:
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
      >() || 10,
  } satisfies ICommunityPlatformInventorySuppliers.IRequest;
  const searchResult =
    await api.functional.communityPlatform.admin.inventory_suppliers.index(
      adminConnection,
      {
        body: searchRequest,
      },
    );
  // Step 3: Validate response structure
  typia.assert(searchResult);
  // Validate pagination properties
  TestValidator.equals(
    "pagination current is >= 1",
    searchResult.pagination.current,
    searchResult.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is in range",
    searchResult.pagination.limit >= 1 && searchResult.pagination.limit <= 50,
    true,
  );
  TestValidator.equals(
    "pagination records is >= 0",
    searchResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is >= 0",
    searchResult.pagination.pages >= 0,
    true,
  );
  // Validate data structure
  TestValidator.predicate("data is an array", Array.isArray(searchResult.data));
  TestValidator.equals(
    "data length matches pagination",
    searchResult.data.length,
    searchResult.pagination.records,
  );
  // Validate each data item is ISummary
  searchResult.data.forEach((item) => {
    typia.assert<ICommunityPlatformInventorySuppliers.ISummary>(item);
  });
  return Promise.resolve();
}
