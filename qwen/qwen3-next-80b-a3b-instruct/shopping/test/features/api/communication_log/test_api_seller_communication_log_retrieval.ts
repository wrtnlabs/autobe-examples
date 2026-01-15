import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerCommunicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerCommunicationLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerCommunicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLog";
import type { IShoppingMallSellerCommunicationLogAdditionalFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLogAdditionalFilters";
import type { IShoppingMallSellerCommunicationLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLogMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_communication_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a valid UUID for sellerId (as creating a seller is not possible)
  // The API expects a sellerId as a UUID format, so we generate one
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve communication logs for the seller with pagination and sort
  const page = 1;
  const limit = 10;
  const response: IPageIShoppingMallSellerCommunicationLog =
    await api.functional.shoppingMall.admin.sellers.communication_logs.index(
      adminConnection,
      {
        sellerId,
        body: {
          page,
          limit,
          sort_by: "created_at",
          order: "desc",
        } satisfies IShoppingMallSellerCommunicationLog.IRequest,
      },
    );
  typia.assert(response);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => response.pagination.pages >= 0,
  );
  // Step 5: Validate logs structure and content (each response item is an IShoppingMallSellerCommunicationLog)
  for (const log of response.data) {
    // Validate required fields per IShoppingMallSellerCommunicationLog
    typia.assert(log); // Complete type validation
    TestValidator.predicate(
      "log has non-empty content",
      () => log.content.length > 0,
    );
    TestValidator.predicate("log has valid type", () =>
      [
        "system_notification",
        "seller_inquiry",
        "admin_response",
        "compliance_alert",
        "policy_update",
        "support_ticket",
        "warning",
        "suspension_notice",
        "appeal_response",
      ].includes(log.type),
    );
    TestValidator.predicate("log has valid severity", () =>
      ["low", "medium", "high", "critical"].includes(log.severity),
    );
    TestValidator.predicate("log has valid date-time format", () =>
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(log.created_at),
    );
  }
  // Step 6: Validate chronological order (descending)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at);
    const next = new Date(response.data[i + 1].created_at);
    TestValidator.predicate(
      "logs are ordered by created_at descending",
      () => current >= next,
    );
  }
}
