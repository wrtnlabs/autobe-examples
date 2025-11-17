import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";

export async function test_api_shopping_mall_admin_refund_request_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = `${RandomGenerator.name(1).toLowerCase()}_${RandomGenerator.alphaNumeric(4)}@admin.example.com`;
  const adminPassword = "StrongP@ss123";
  const href = "https://admin.example.com/join_page";
  const referrer = "https://admin.example.com/home";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: href,
        referrer: referrer,
        ip: null,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare refundRequestId
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve refund request details
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.at(connection, {
      refundRequestId: refundRequestId,
    });
  typia.assert(refundRequest);

  // 4. Validate refund request fields
  TestValidator.predicate(
    "refund amount positive",
    refundRequest.refund_amount > 0,
  );

  TestValidator.predicate(
    "refund status is non-empty string",
    typeof refundRequest.refund_status === "string" &&
      refundRequest.refund_status.length > 0,
  );

  TestValidator.predicate(
    "requested_at is valid ISO date-time",
    typeof refundRequest.requested_at === "string" &&
      !Number.isNaN(Date.parse(refundRequest.requested_at)),
  );

  if (
    refundRequest.processed_at !== null &&
    refundRequest.processed_at !== undefined
  ) {
    TestValidator.predicate(
      "processed_at is valid ISO date-time",
      typeof refundRequest.processed_at === "string" &&
        !Number.isNaN(Date.parse(refundRequest.processed_at)),
    );
  }

  if (
    refundRequest.deleted_at !== null &&
    refundRequest.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid ISO date-time",
      typeof refundRequest.deleted_at === "string" &&
        !Number.isNaN(Date.parse(refundRequest.deleted_at)),
    );
  }
}
