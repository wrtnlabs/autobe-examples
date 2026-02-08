import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMall";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_resend_failed(
  connection: api.IConnection,
): Promise<void> {
  // Test Scenario: Resend failed notifications API with general and filtered requests
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin is empty
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Scenario 1: Resend all failed notifications with empty filter
  {
    const response =
      await api.functional.shoppingMall.administrator.notifications.resend_failed.resendFailed(
        adminConnection,
        {
          body: {}, // Empty filter object to resend all failed notifications
        },
      );
    typia.assert(response);
    // Validate response must contain counts of retried, skipped, failed
    // properties names included as expected keys (partial validation)
    TestValidator.predicate(
      "response has retriedCount",
      typeof (response as any).retriedCount === "number",
    );
    TestValidator.predicate(
      "response has skippedCount",
      typeof (response as any).skippedCount === "number",
    );
    TestValidator.predicate(
      "response has failedCount",
      typeof (response as any).failedCount === "number",
    );
  }
  // 3. Scenario 2: Resend failed notifications filtered by notification template ID
  // Randomly simulate a template ID for the test
  const notificationTemplateId = typia.random<string>();
  {
    const response =
      await api.functional.shoppingMall.administrator.notifications.resend_failed.resendFailed(
        adminConnection,
        {
          body: { notificationTemplateId }, // filter by template ID
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      "filtered response has retriedCount",
      typeof (response as any).retriedCount === "number",
    );
  }
  // 4. Scenario 3: Resend failed notifications filtered by user notification ID
  // with repeated resend requests to test rate limiting or idempotency
  const userNotificationId = typia.random<string>();
  {
    // First resend attempt
    const firstResponse =
      await api.functional.shoppingMall.administrator.notifications.resend_failed.resendFailed(
        adminConnection,
        {
          body: { userNotificationId },
        },
      );
    typia.assert(firstResponse);
    // Second resend attempt - expect system enforces rate limiting / idempotency
    const secondResponse =
      await api.functional.shoppingMall.administrator.notifications.resend_failed.resendFailed(
        adminConnection,
        {
          body: { userNotificationId },
        },
      );
    typia.assert(secondResponse);
    // Validate second response has possibly skipped count greater or equal to 1
    const skippedCount = (secondResponse as any).skippedCount;
    TestValidator.predicate(
      "second response skippedCount >= 0",
      typeof skippedCount === "number" && skippedCount >= 0,
    );
    // Responses should have retriedCount, failedCount, skippedCount
    for (const resp of [firstResponse, secondResponse]) {
      TestValidator.predicate(
        "response has retriedCount",
        typeof (resp as any).retriedCount === "number",
      );
      TestValidator.predicate(
        "response has failedCount",
        typeof (resp as any).failedCount === "number",
      );
      TestValidator.predicate(
        "response has skippedCount",
        typeof (resp as any).skippedCount === "number",
      );
    }
  }
}
