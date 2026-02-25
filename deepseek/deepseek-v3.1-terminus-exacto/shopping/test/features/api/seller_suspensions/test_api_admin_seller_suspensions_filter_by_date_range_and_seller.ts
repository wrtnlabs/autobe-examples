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

export async function test_api_admin_seller_suspensions_filter_by_date_range_and_seller(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate test data: dates for filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Generate email patterns for seller filtering
  const sellerEmailDomain = "@test-seller.com";
  const sellerEmailPattern = `seller-${RandomGenerator.alphabets(5)}${sellerEmailDomain}`;
  const sellerEmailPartial = sellerEmailPattern.split("@")[0].slice(0, 5);
  // TEST 1: Filter by date range only
  const dateRangeResponse =
    await api.functional.ecommerce.administrator.admin_seller_suspensions.index(
      adminConnection,
      {
        body: {
          suspension_start_date_min: oneMonthAgo.toISOString(),
          suspension_end_date_max: tomorrow.toISOString(),
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Validate date range filtering
  if (dateRangeResponse.data.length > 0) {
    for (const suspension of dateRangeResponse.data) {
      const startDate = new Date(suspension.suspension_start_date);
      const endDate = suspension.suspension_end_date
        ? new Date(suspension.suspension_end_date)
        : null;
      TestValidator.predicate(
        "suspension start date should be after min date",
        startDate >= oneMonthAgo,
      );
      if (endDate) {
        TestValidator.predicate(
          "suspension end date should be before max date",
          endDate <= tomorrow,
        );
      }
    }
  }
  // TEST 2: Filter by seller email pattern (partial matching)
  const sellerEmailResponse =
    await api.functional.ecommerce.administrator.admin_seller_suspensions.index(
      adminConnection,
      {
        body: {
          seller_email: sellerEmailPattern satisfies string &
            tags.Format<"email">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(sellerEmailResponse);
  // Validate seller email filtering
  if (sellerEmailResponse.data.length > 0) {
    for (const suspension of sellerEmailResponse.data) {
      TestValidator.predicate(
        "seller email should match pattern",
        suspension.seller.email.includes(sellerEmailPartial),
      );
    }
  }
  // TEST 3: Combined filtering with date range AND seller email
  const combinedResponse =
    await api.functional.ecommerce.administrator.admin_seller_suspensions.index(
      adminConnection,
      {
        body: {
          suspension_start_date_min: oneWeekAgo.toISOString(),
          suspension_end_date_max: now.toISOString(),
          seller_email: sellerEmailPattern satisfies string &
            tags.Format<"email">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined filtering
  if (combinedResponse.data.length > 0) {
    for (const suspension of combinedResponse.data) {
      const startDate = new Date(suspension.suspension_start_date);
      const endDate = suspension.suspension_end_date
        ? new Date(suspension.suspension_end_date)
        : null;
      TestValidator.predicate(
        "combined filter: start date should be within range",
        startDate >= oneWeekAgo && startDate <= now,
      );
      TestValidator.predicate(
        "combined filter: seller email should match pattern",
        suspension.seller.email.includes(sellerEmailPartial),
      );
    }
  }
  // TEST 4: Default pagination (no filters)
  const defaultResponse =
    await api.functional.ecommerce.administrator.admin_seller_suspensions.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    defaultResponse.pagination.current === 1 &&
      defaultResponse.pagination.limit === 5 &&
      defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length should match limit or be less on last page",
    defaultResponse.data.length <= 5,
  );
}
