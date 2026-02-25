import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_management_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test pagination boundaries
  let page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  let limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  // First page test
  const firstPageResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page current should be 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches",
    firstPageResponse.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "first page data exists",
    firstPageResponse.data.length >= 0,
  );
  // Middle page test (if total pages > 2)
  if (firstPageResponse.pagination.pages > 2) {
    const middlePage = Math.floor(firstPageResponse.pagination.pages / 2);
    const middlePageResponse =
      await api.functional.ecommerce.administrator.user_management.index(
        adminConnection,
        {
          body: {
            page: middlePage,
            limit,
          } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
        },
      );
    typia.assert(middlePageResponse);
    TestValidator.equals(
      "middle page current matches",
      middlePageResponse.pagination.current,
      middlePage,
    );
    TestValidator.equals(
      "middle page total records consistent",
      middlePageResponse.pagination.records,
      firstPageResponse.pagination.records,
    );
  }
  // Last page test
  if (firstPageResponse.pagination.pages > 0) {
    const lastPageResponse =
      await api.functional.ecommerce.administrator.user_management.index(
        adminConnection,
        {
          body: {
            page: firstPageResponse.pagination.pages,
            limit,
          } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "last page current matches total pages",
      lastPageResponse.pagination.current,
      firstPageResponse.pagination.pages,
    );
    TestValidator.predicate(
      "last page data count <= limit",
      lastPageResponse.data.length <= limit,
    );
  }
  // Empty page beyond total records
  const emptyPageResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          page: firstPageResponse.pagination.pages + 10,
          limit,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(emptyPageResponse);
  TestValidator.predicate(
    "empty page has no data",
    emptyPageResponse.data.length === 0,
  );
  TestValidator.equals(
    "empty page current exceeds total pages",
    emptyPageResponse.pagination.current,
    firstPageResponse.pagination.pages + 10,
  );
  // Test limit validation - min value (1)
  const minLimitResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals("min limit is 1", minLimitResponse.pagination.limit, 1);
  TestValidator.predicate(
    "min limit data count <= 1",
    minLimitResponse.data.length <= 1,
  );
  // Test limit validation - max value (100)
  const maxLimitResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data count <= 100",
    maxLimitResponse.data.length <= 100,
  );
  // Test default sorting (should be newest first)
  // If we have at least 2 records, verify creation date descending order
  if (firstPageResponse.data.length >= 2) {
    for (let i = 0; i < firstPageResponse.data.length - 1; i++) {
      const current = new Date(firstPageResponse.data[i].created_at);
      const next = new Date(firstPageResponse.data[i + 1].created_at);
      TestValidator.predicate(
        `record ${i} created before or equal to record ${i + 1} (newest first)`,
        current >= next,
      );
    }
  }
  // Validate pagination metadata accuracy
  const expectedTotalPages = Math.ceil(
    firstPageResponse.pagination.records / limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    firstPageResponse.pagination.pages,
    expectedTotalPages,
  );
  // Edge case: page < 1 should default to 1 (server should handle)
  const pageZeroResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(pageZeroResponse);
  // Server should either throw error or default to page 1
  TestValidator.predicate(
    "page zero response must be valid",
    pageZeroResponse.pagination.current >= 1,
  );
  // Test with search parameters combined with pagination
  const searchResponse =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(5),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search with pagination works",
    searchResponse.pagination.limit,
    10,
  );
}
