import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeEvent";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate not-found style behavior of admin dispute event detail endpoint when
 * targeting non-existent disputeCode and disputeEventId.
 *
 * Business expectations:
 *
 * - Admin must be authenticated before using the admin dispute event detail API.
 * - When the specified disputeCode and/or disputeEventId do not exist, the
 *   endpoint must respond with an error (logically not-found style) rather than
 *   returning a normal IShoppingMallDisputeEvent payload.
 * - The test must never send wrong-typed data; only business-level non-existence
 *   is verified.
 *
 * Test steps:
 *
 * 1. Join an admin via POST /auth/admin/join using random but valid
 *    IShoppingMallAdminJoin.ICreate payload. The SDK will inject the access
 *    token into connection.headers automatically.
 * 2. Generate obviously non-existent identifiers:
 *
 *    - DisputeCode: random string
 *    - DisputeEventId: random UUID string & tags.Format<"uuid">.
 * 3. Call GET /shoppingMall/admin/disputes/{disputeCode}/events/{disputeEventId}
 *    via api.functional.shoppingMall.admin.disputes.events.at and verify that
 *    it throws an HttpError using TestValidator.error. We do not assert an
 *    exact status code to avoid tight coupling to implementation; we only
 *    ensure an error is thrown instead of a successful
 *    IShoppingMallDisputeEvent.
 * 4. Repeat step 3 with another set of random identifiers to ensure consistent
 *    behavior.
 */
export async function test_api_dispute_event_detail_not_found_for_unknown_ids(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Prepare clearly non-existent dispute identifiers
  const unknownDisputeCode: string = RandomGenerator.alphaNumeric(24);
  const unknownDisputeEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. First negative call: expect error when dispute and event are unknown
  await TestValidator.error(
    "unknown disputeCode and eventId must error",
    async () => {
      await api.functional.shoppingMall.admin.disputes.events.at(connection, {
        disputeCode: unknownDisputeCode,
        disputeEventId: unknownDisputeEventId,
      });
    },
  );

  // 4. Second negative variant with different random identifiers to
  //    confirm consistent behavior for other unknown combinations.
  const anotherUnknownDisputeCode: string = RandomGenerator.alphaNumeric(16);
  const anotherUnknownDisputeEventId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "another unknown disputeCode and eventId must also error",
    async () => {
      await api.functional.shoppingMall.admin.disputes.events.at(connection, {
        disputeCode: anotherUnknownDisputeCode,
        disputeEventId: anotherUnknownDisputeEventId,
      });
    },
  );
}
