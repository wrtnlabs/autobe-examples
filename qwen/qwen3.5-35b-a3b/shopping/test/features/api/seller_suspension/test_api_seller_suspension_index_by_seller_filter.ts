import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspension_index_by_seller_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminAuth = await authorize_administrator_join(connection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 3. Create a test seller UUID to filter by
  const testSellerId = typia.random<string & tags.Format<"uuid">>();
  // 4. Query suspensions with seller_id filter
  // Note: This will return empty if no suspensions exist for this seller
  // The test validates the filtering mechanism and response structure
  const suspensionsResponse =
    await api.functional.ecommerceMall.administrator.seller_suspensions.index(
      adminConnection,
      {
        body: {
          seller_id: testSellerId,
          sort_by: "suspended_at",
          sort_order: "desc" as const,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(suspensionsResponse);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    suspensionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    suspensionsResponse.pagination.limit,
    20,
  );
  // 6. Verify each suspension record structure (if any exist)
  for (const suspension of suspensionsResponse.data) {
    // Validate suspension has required ID fields
    typia.assert(suspension);
    // Verify seller_id matches filter
    TestValidator.equals(
      "suspension seller_id matches filter",
      suspension.seller_id,
      testSellerId,
    );
    // Verify suspendedByAdmin relationship exists
    typia.assert(suspension.suspendedByAdmin);
    TestValidator.equals(
      "suspendedByAdmin has id",
      suspension.suspendedByAdmin.id !== undefined,
      true,
    );
    TestValidator.equals(
      "suspendedByAdmin has email",
      suspension.suspendedByAdmin.email !== undefined,
      true,
    );
    TestValidator.equals(
      "suspendedByAdmin has displayName",
      suspension.suspendedByAdmin.displayName !== undefined,
      true,
    );
    // Verify suspended_by_admin_id matches suspendedByAdmin.id
    TestValidator.equals(
      "suspended_by_admin_id matches suspendedByAdmin.id",
      suspension.suspended_by_admin_id,
      suspension.suspendedByAdmin.id,
    );
    // Verify suspension has required timestamp fields
    TestValidator.equals(
      "suspension has suspended_at",
      suspension.suspended_at !== undefined,
      true,
    );
    TestValidator.equals(
      "suspension has created_at",
      suspension.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "suspension has updated_at",
      suspension.updated_at !== undefined,
      true,
    );
    // Verify reason is present
    TestValidator.equals(
      "suspension has reason",
      suspension.reason !== undefined && suspension.reason.length > 0,
      true,
    );
    // Verify resolved_at can be null (active) or non-null (resolved)
    // This validates the type allows both cases
    TestValidator.predicate(
      "resolved_at is null or non-null string",
      suspension.resolved_at === null ||
        (typeof suspension.resolved_at === "string" &&
          suspension.resolved_at.length > 0),
    );
  }
  // 7. Verify sorting is by suspended_at descending
  if (suspensionsResponse.data.length > 1) {
    for (let i = 1; i < suspensionsResponse.data.length; i++) {
      const prev = suspensionsResponse.data[i - 1];
      const curr = suspensionsResponse.data[i];
      // suspended_at should be in descending order
      TestValidator.predicate(
        `suspended_at is in descending order at index ${i}`,
        () => new Date(prev.suspended_at) >= new Date(curr.suspended_at),
      );
    }
  }
  // 8. Verify total records count matches data array length
  TestValidator.equals(
    "pagination records count matches data array length",
    suspensionsResponse.pagination.records,
    suspensionsResponse.data.length,
  );
  // 9. Verify pages calculation is correct
  const expectedPages =
    suspensionsResponse.data.length === 0
      ? 0
      : Math.ceil(
          suspensionsResponse.data.length /
            suspensionsResponse.pagination.limit,
        );
  TestValidator.equals(
    "pagination pages is calculated correctly",
    suspensionsResponse.pagination.pages,
    expectedPages,
  );
}
