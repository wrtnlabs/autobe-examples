import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPaymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPaymentLog";
import type { IPageICommunityPlatformPaymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPaymentLog";

export async function test_api_payment_logs_combined_filtering_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Prepare request with filtering and sorting
  // Admin authentication assumed via pre-configured connection
  const request: ICommunityPlatformPaymentLog.IRequest = {
    status: ["completed"],
    order_by: "amount",
    direction: "desc",
    page: 1,
    limit: 25,
  };

  // Step 2: Fetch filtered and sorted payment logs
  const response: IPageICommunityPlatformPaymentLog =
    await api.functional.communityPlatform.admin.payments.logs.index(
      connection,
      { body: request },
    );
  typia.assert(response);

  // Step 3: Validate successful response structure and non-empty result
  TestValidator.equals("response is not empty", response.length > 0, true);
}
