import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test platform events pagination with empty result set.
 *
 * Validates that the platform events API properly handles filtering criteria that yield no results,
 * ensuring correct pagination metadata is returned even when no events match the search criteria.
 */
export async function test_api_platform_events_empty_result_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Set up filtering criteria that guarantees no matches
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const searchCriteria: IEcommercePlatformEvent.IRequest = {
    date_from: tomorrow satisfies string & tags.Format<"date-time"> as string &
      tags.Format<"date-time">,
    event_type: "non_existent_event_type_that_will_never_match",
    page: 1,
    limit: 10,
  };
  // 3. Call platform events API
  const response =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      { body: searchCriteria },
    );
  typia.assert(response);
  // 4. Validate empty result set
  TestValidator.equals("data array should be empty", response.data, []);
  // 5. Validate pagination metadata for empty result set
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", response.pagination.pages, 0);
}
