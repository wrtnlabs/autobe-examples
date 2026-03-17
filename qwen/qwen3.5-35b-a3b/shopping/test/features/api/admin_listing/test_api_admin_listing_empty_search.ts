import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test admin listing with empty search results.
 * Validates edge case when no administrators match search criteria.
 */
export async function test_api_admin_listing_empty_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // 2. Send empty search request with non-matching criteria
  const emptySearchResult: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent123",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // 3. Validate empty search results
  TestValidator.equals("data array is empty", emptySearchResult.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    emptySearchResult.pagination.limit,
    20,
  );
}
