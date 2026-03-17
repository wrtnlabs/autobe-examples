import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_platform_configurations_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Test sorting by configuration_key ascending (alphabetical)
  const sortedByKeyResponse =
    await api.functional.ecommerceMall.admin.platform_configurations.index(
      adminConnection,
      {
        body: {
          sort_by: "configuration_key",
          sort_order: "asc",
        },
      },
    );
  typia.assert(sortedByKeyResponse);
  // Validate alphabetical order of configuration_key
  if (sortedByKeyResponse.data.length >= 2) {
    for (let i = 0; i < sortedByKeyResponse.data.length - 1; i++) {
      const currentKey = sortedByKeyResponse.data[i].configuration_key;
      const nextKey = sortedByKeyResponse.data[i + 1].configuration_key;
      TestValidator.predicate(
        `configuration_key alphabetical order at index ${i}`,
        currentKey <= nextKey,
      );
    }
  }
  // 3. Test custom page size (limit=5)
  const limitedPageResponse =
    await api.functional.ecommerceMall.admin.platform_configurations.index(
      adminConnection,
      {
        body: {
          limit: 5,
        },
      },
    );
  typia.assert(limitedPageResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    limitedPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    limitedPageResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records is positive",
    limitedPageResponse.pagination.records > 0,
  );
  // Calculate expected total pages (ceiling of records / limit)
  const expectedTotalPages = Math.ceil(
    limitedPageResponse.pagination.records /
      limitedPageResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination total pages calculated correctly",
    limitedPageResponse.pagination.pages,
    expectedTotalPages,
  );
  // 4. Test page navigation (page=2 with limit=5)
  const page2Response =
    await api.functional.ecommerceMall.admin.platform_configurations.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2Response);
  // Validate current page is 2
  TestValidator.equals(
    "page 2 current page metadata",
    page2Response.pagination.current,
    2,
  );
  // Validate limit maintained on page 2
  TestValidator.equals(
    "pagination limit maintained on page 2",
    page2Response.pagination.limit,
    5,
  );
}
