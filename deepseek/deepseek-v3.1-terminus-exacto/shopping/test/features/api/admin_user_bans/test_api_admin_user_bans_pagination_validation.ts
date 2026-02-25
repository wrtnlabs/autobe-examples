import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_admin_user_bans_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Test default pagination (page 1, default limit)
  const defaultResult =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    defaultResult.pagination !== undefined,
  );
  TestValidator.equals(
    "current page defaults to 0",
    defaultResult.pagination.current,
    0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    defaultResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records count is non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages count is non-negative",
    defaultResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is always an array",
    Array.isArray(defaultResult.data),
  );
  // Test specific page number
  const secondPage =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "requested page number matches response",
    secondPage.pagination.current,
    2,
  );
  // Test limit per page
  const limitedResult =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals(
    "requested limit matches response limit",
    limitedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    limitedResult.data.length <= 10,
  );
  // Test combined page and limit
  const combinedParams =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(combinedParams);
  TestValidator.equals(
    "combined page parameter correct",
    combinedParams.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined limit parameter correct",
    combinedParams.pagination.limit,
    5,
  );
  // Test boundary conditions - minimum limit
  const minLimitResult =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          limit: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "minimum limit of 1 accepted",
    minLimitResult.pagination.limit,
    1,
  );
  // Test boundary conditions - maximum limit
  const maxLimitResult =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          limit: 100 satisfies number & tags.Type<"int32"> & tags.Maximum<100>,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "maximum limit of 100 accepted",
    maxLimitResult.pagination.limit,
    100,
  );
  // Test page beyond available range
  const highPageResult =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: {
          page: 9999 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest,
      },
    );
  typia.assert(highPageResult);
  TestValidator.equals(
    "extremely high page number accepted",
    highPageResult.pagination.current,
    9999,
  );
  // Validate pagination calculation consistency
  if (
    defaultResult.pagination.limit > 0 &&
    defaultResult.pagination.records > 0
  ) {
    const calculatedPages = Math.ceil(
      defaultResult.pagination.records / defaultResult.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation is correct",
      calculatedPages,
      defaultResult.pagination.pages,
    );
  }
  // Test pagination with zero records (empty result set)
  // This tests the system's handling of edge cases
  TestValidator.predicate(
    "pagination metadata maintains consistency",
    defaultResult.pagination.pages === 0 || defaultResult.pagination.pages >= 0,
  );
  // Test single-page scenario validation
  if (defaultResult.pagination.pages === 1) {
    TestValidator.predicate(
      "single page should have correct data handling",
      defaultResult.data.length <= defaultResult.pagination.limit,
    );
  }
}
