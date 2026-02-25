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

export async function test_api_refund_admin_delete_inappropriate_response(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate random UUIDs for refund request and response
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const responseId = typia.random<string & tags.Format<"uuid">>();
  // Since we don't have APIs to create refund requests,
  // we test the delete endpoint with random IDs
  // This should error since the response doesn't exist
  // This validates that the endpoint requires valid IDs
  await TestValidator.error(
    "delete non-existent refund response should fail",
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
  // Test with another random ID to ensure consistent behavior
  const anotherRefundRequestId = typia.random<string & tags.Format<"uuid">>();
  const anotherResponseId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "another delete non-existent refund response should also fail",
    async () => {
      await api.functional.ecommerce.administrator.refund_requests.responses.erase(
        adminConnection,
        {
          refundRequestId: anotherRefundRequestId,
          responseId: anotherResponseId,
        },
      );
    },
  );
  // Validate administrator connection has headers set
  TestValidator.predicate(
    "administrator connection has authorization headers",
    adminConnection.headers !== undefined &&
      adminConnection.headers.Authorization !== undefined &&
      typeof adminConnection.headers.Authorization === "string",
  );
}
