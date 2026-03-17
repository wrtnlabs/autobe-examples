import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator receives empty result page when querying seller registrations
 * with filter criteria that match no records.
 *
 * This test validates the boundary condition where the query returns zero results.
 * The system should gracefully handle empty result sets with proper pagination metadata.
 */
export async function test_api_seller_registration_admin_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Query seller registrations with future date filters to ensure no results
  const result =
    await api.functional.ecommerceMall.admin.seller_registrations.index(
      adminConnection,
      {
        body: {
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          cursor: null,
          status: "approved",
          sellerId: null,
          reviewerId: null,
          createdAtFrom: "2050-01-01T00:00:00.000Z",
          createdAtTo: "2050-12-31T23:59:59.999Z",
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
          page: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty result structure
  TestValidator.equals("data should be empty array", result.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination limit should match request",
    result.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current should be 0",
    result.pagination.current,
    0,
  );
}
