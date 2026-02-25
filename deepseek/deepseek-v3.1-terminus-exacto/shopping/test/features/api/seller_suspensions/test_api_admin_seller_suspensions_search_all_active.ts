import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_admin_seller_suspensions_search_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Search for all active suspensions with specific status filter
  const searchResults =
    await api.functional.ecommerce.administrator.admin_seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "active" as const,
          page: 1,
          limit: 20,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  // Complete runtime type validation - validates ALL properties automatically
  typia.assert(searchResults);
  // Validate business logic only (NO type validation after typia.assert)
  TestValidator.predicate(
    "status filter returns only active suspensions",
    searchResults.data.every((suspension) => suspension.status === "active"),
  );
  // Validate reverse chronological order if multiple records exist
  if (searchResults.data.length > 1) {
    TestValidator.predicate(
      "suspensions are ordered by reverse chronological",
      () => {
        for (let i = 1; i < searchResults.data.length; i++) {
          const currentDate = new Date(
            searchResults.data[i].suspension_start_date,
          );
          const previousDate = new Date(
            searchResults.data[i - 1].suspension_start_date,
          );
          if (previousDate < currentDate) return false;
        }
        return true;
      },
    );
  }
}
