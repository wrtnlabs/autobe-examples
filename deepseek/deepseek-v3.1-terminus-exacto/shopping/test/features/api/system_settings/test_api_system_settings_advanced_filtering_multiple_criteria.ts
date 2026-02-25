import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_settings_advanced_filtering_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test 1: Basic filtering by value type
  const stringSettings =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          value_type: "string",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(stringSettings);
  // Test 2: Filter by active status
  const activeSettings =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          is_active: true,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(activeSettings);
  // Test 3: Combined filtering - active string settings
  const combinedFilters =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          value_type: "string",
          is_active: true,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Test 4: Search pattern matching
  const searchResults =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          search: "payment",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(searchResults);
  // Test 5: Pagination validation
  const firstPage =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<2>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(secondPage);
  // Test 6: Empty result set scenario
  const emptyResults =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_setting_key",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Test 7: Mixed boolean query
  const mixedBoolean =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          value_type: "boolean",
          is_active: true,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(mixedBoolean);
  // Test 8: Maximum limit validation
  const maxLimitResults =
    await api.functional.ecommerce.administrator.system_settings.index(
      adminConnection,
      {
        body: {
          limit: 100 satisfies number as number,
        } satisfies IEcommerceSystemSetting.IRequest,
      },
    );
  typia.assert(maxLimitResults);
  // Validate business logic only - NO TYPE VALIDATION AFTER typia.assert()
  TestValidator.equals(
    "pagination current page validation",
    firstPage.pagination.current,
    1,
  );
  // Test pagination functionality without type checking
  TestValidator.predicate(
    "page limit should be respected",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.notEquals(
    "different pages should have different data",
    firstPage.data,
    secondPage.data,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    firstPage.pagination.records >= 0,
  );
}
