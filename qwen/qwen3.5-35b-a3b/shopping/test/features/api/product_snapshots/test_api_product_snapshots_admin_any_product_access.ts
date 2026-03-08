import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshots_admin_any_product_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Test basic snapshot retrieval with random product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  const basicResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {},
      },
    );
  typia.assert(basicResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "response has pagination structure",
    basicResponse.pagination,
    {
      current: 1,
      limit: 20,
      records: 0,
      pages: 0,
    },
  );
  // 4. Test pagination parameters
  const paginationResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination with page=1,limit=20",
    paginationResponse.pagination,
    { current: 1, limit: 20, records: 0, pages: 0 },
  );
  // 5. Test descending sort (default)
  const descSortResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(descSortResponse);
  // 6. Test ascending sort
  const ascSortResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(ascSortResponse);
  // 7. Test date range filtering
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateFilterResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          startDate,
          endDate,
        },
      },
    );
  typia.assert(dateFilterResponse);
  // 8. Test category enrichment
  const categoryEnrichmentResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          includeCategory: true,
        },
      },
    );
  typia.assert(categoryEnrichmentResponse);
  // 9. Test large page size (max 100)
  const largePageSizeResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(largePageSizeResponse);
  TestValidator.equals(
    "max page size limit=100",
    largePageSizeResponse.pagination,
    { current: 1, limit: 100, records: 0, pages: 0 },
  );
  // 10. Test multi-parameter combination
  const combinedResponse =
    await api.functional.ecommerceMall.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          page: 2,
          limit: 50,
          sortBy: "created_at",
          sortOrder: "asc",
          startDate,
          endDate,
          includeCategory: true,
        },
      },
    );
  typia.assert(combinedResponse);
}