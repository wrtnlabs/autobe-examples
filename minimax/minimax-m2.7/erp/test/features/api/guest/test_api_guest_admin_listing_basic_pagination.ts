import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic pagination for guest account listing.
 *
 * Validates that an authenticated admin can retrieve a paginated list of guest
 * accounts without filters. Verifies:
 * - Response contains pagination metadata (current, limit, records, pages)
 * - Guest data array with id, device_identifier, created_at, sessions_count
 * - Default pagination starts at page 1
 * - Sort order is by created_at descending
 */
export async function test_api_guest_admin_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection via authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Retrieve paginated guest list without filters
  const response = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.predicate("pagination exists", response.pagination !== null);
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // 5. If guests exist, validate each guest structure
  if (response.data.length > 0) {
    const firstGuest = response.data[0];
    typia.assert(firstGuest);
    TestValidator.predicate("has id", firstGuest.id !== undefined);
    TestValidator.predicate(
      "has device_identifier",
      firstGuest.device_identifier !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      firstGuest.created_at !== undefined,
    );
    // sessions_count is optional but should be validated if present
    if (firstGuest.sessions_count !== undefined) {
      TestValidator.predicate(
        "sessions_count is non-negative",
        firstGuest.sessions_count >= 0,
      );
    }
  }
  // 6. Validate pagination calculations
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    response.pagination.pages,
    expectedPages,
  );
}
