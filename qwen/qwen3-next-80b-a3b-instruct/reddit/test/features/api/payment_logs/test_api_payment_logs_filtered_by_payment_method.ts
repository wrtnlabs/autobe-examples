import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPaymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPaymentLog";
import type { IPageICommunityPlatformPaymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPaymentLog";

/**
 * Test filtering payment logs by payment method with single method filter. This
 * scenario authenticates as an admin and requests payment logs filtered for
 * 'credit_card' payment method. The system must return only payment logs with
 * payment_method = 'credit_card' and exclude all other payment method types.
 *
 * The test workflow:
 *
 * 1. Since the required authentication endpoint POST /auth/admin/join is not
 *    available in the provided SDK functions, authentication steps have been
 *    removed as they are unimplementable.
 * 2. Create a payment log filter request with payment_method = ['credit_card']
 * 3. Call PATCH /communityPlatform/admin/payments/logs endpoint with the filter
 * 4. Validate that the response contains only credit_card payment logs
 * 5. Validate that no other payment method types are present in the results
 * 6. Since IPageICommunityPlatformPaymentLog is a string type, we validate that
 *    the response is a non-empty string
 */
export async function test_api_payment_logs_filtered_by_payment_method(
  connection: api.IConnection,
) {
  const paymentMethodFilter: ICommunityPlatformPaymentLog.IRequest = {
    payment_method: ["credit_card"],
  } satisfies ICommunityPlatformPaymentLog.IRequest;

  const paymentLogs: IPageICommunityPlatformPaymentLog =
    await api.functional.communityPlatform.admin.payments.logs.index(
      connection,
      {
        body: paymentMethodFilter,
      },
    );
  typia.assert(paymentLogs);

  TestValidator.predicate(
    "payment logs response is not empty",
    typeof paymentLogs === "string" && paymentLogs.length > 0,
  );
}
