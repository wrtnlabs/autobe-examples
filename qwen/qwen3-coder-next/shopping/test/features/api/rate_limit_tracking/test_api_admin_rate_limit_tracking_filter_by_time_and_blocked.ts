import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRateLimitTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRateLimitTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_rate_limit_tracking_filter_by_time_and_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using existing admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Use mock credentials for admin authentication since real admin may not exist
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Get current time and define time window
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  const timeWindowStart = new Date(now.getTime() - oneHour).toISOString();
  const timeWindowEnd = now.toISOString();
  // Test 1: Filter by time window range only
  const timeFiltered =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.index(
      adminConnection,
      {
        body: {
          window_start_range: {
            from: timeWindowStart,
            to: timeWindowEnd,
          },
        } satisfies IEcommerceMallRateLimitTracking.IRequest,
      },
    );
  typia.assert(timeFiltered);
  // Test 2: Filter by blocked status only
  const blockedFiltered =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.index(
      adminConnection,
      {
        body: {
          blocked: true,
        } satisfies IEcommerceMallRateLimitTracking.IRequest,
      },
    );
  typia.assert(blockedFiltered);
  // Test 3: Combine filters - time window and blocked status
  const combinedFiltered =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.index(
      adminConnection,
      {
        body: {
          window_start_range: {
            from: timeWindowStart,
            to: timeWindowEnd,
          },
          blocked: true,
        } satisfies IEcommerceMallRateLimitTracking.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // Validate time filtering results
  if (timeFiltered.data.length > 0) {
    timeFiltered.data.forEach((record) => {
      TestValidator.predicate(
        "time filtered records within window",
        record.window_start >= timeWindowStart &&
          record.window_start <= timeWindowEnd,
      );
    });
  }
  // Validate blocked status filtering results
  if (blockedFiltered.data.length > 0) {
    blockedFiltered.data.forEach((record) => {
      TestValidator.equals(
        "blocked status matches filter",
        record.blocked,
        true,
      );
    });
  }
  // Validate combined filtering results
  if (combinedFiltered.data.length > 0) {
    combinedFiltered.data.forEach((record) => {
      TestValidator.predicate(
        "combined filter: time and blocked",
        record.window_start >= timeWindowStart &&
          record.window_start <= timeWindowEnd &&
          record.blocked === true,
      );
    });
  }
}
