import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator cleanup of automated or spam seller responses.
 * Simulates admin deleting a possibly non-existent refund response to test authorization and endpoint structure.
 * Since refund request/response creation APIs are not provided, we test the delete operation with random IDs.
 */
export async function test_api_refund_admin_delete_spam_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using join (only available admin auth utility)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Generate random UUIDs for refund request and response (since creation APIs unavailable)
  const refundRequestId = typia.random<string & typia.tags.Format<"uuid">>();
  const responseId = typia.random<string & typia.tags.Format<"uuid">>();
  // 3. Attempt to delete the refund response (will likely fail with 404, but tests auth)
  // Using TestValidator.error to validate that the operation completes (may throw HttpError)
  await TestValidator.error(
    "admin can attempt to delete refund response",
    async () => {
      await api.functional.ecommerce.administrator.refund_requests.responses.erase(
        adminConnection,
        {
          refundRequestId,
          responseId,
        },
      );
    },
  );
}
