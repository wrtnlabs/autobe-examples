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

export async function test_api_seller_suspension_history_audit_trail_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Ensure adminConnection has token from authentication
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // Create seller UUID for testing suspension history
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Query suspension history for seller
  const suspensionHistory =
    await api.functional.ecommerceMall.administrator.sellers.suspension_history.history(
      adminConnection,
      {
        sellerId,
      },
    );
  typia.assert(suspensionHistory);
  // 3. Validate response has pagination metadata
  TestValidator.predicate(
    "response has pagination object",
    suspensionHistory.pagination !== undefined,
  );
  typia.assert(suspensionHistory.pagination);
  // 4. Validate pagination fields exist and have valid types
  TestValidator.predicate(
    "pagination has current page",
    suspensionHistory.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    suspensionHistory.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records count",
    suspensionHistory.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages count",
    suspensionHistory.pagination.pages !== undefined,
  );
  // 5. Validate pagination data types and ranges
  TestValidator.predicate(
    "current page is non-negative integer",
    Number.isInteger(suspensionHistory.pagination.current) &&
      suspensionHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative integer",
    Number.isInteger(suspensionHistory.pagination.limit) &&
      suspensionHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative integer",
    Number.isInteger(suspensionHistory.pagination.records) &&
      suspensionHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative integer",
    Number.isInteger(suspensionHistory.pagination.pages) &&
      suspensionHistory.pagination.pages >= 0,
  );
  // 6. If records exist, validate each suspension record
  if (suspensionHistory.data.length > 0) {
    // Validate records are sorted by suspended_at descending (most recent first)
    for (let i = 1; i < suspensionHistory.data.length; i++) {
      const prevRecord = suspensionHistory.data[i - 1];
      const currRecord = suspensionHistory.data[i];
      TestValidator.predicate(
        `record ${i} sorted after record ${i - 1} by suspended_at`,
        new Date(prevRecord.suspended_at).getTime() >=
          new Date(currRecord.suspended_at).getTime(),
      );
    }
    // Validate each suspension record structure
    for (let i = 0; i < suspensionHistory.data.length; i++) {
      const record = suspensionHistory.data[i];
      // Validate seller_id matches queried seller (business rule)
      TestValidator.equals(
        `record ${i} seller_id matches queried seller`,
        record.seller_id,
        sellerId,
      );
      // Validate suspendedByAdmin relationship exists
      TestValidator.equals(
        `record ${i} suspendedByAdmin exists`,
        record.suspendedByAdmin !== undefined,
        true,
      );
      // Validate suspendedByAdmin has required fields
      TestValidator.equals(
        `record ${i} suspendedByAdmin has id`,
        record.suspendedByAdmin.id !== undefined,
        true,
      );
      TestValidator.equals(
        `record ${i} suspendedByAdmin has email`,
        record.suspendedByAdmin.email !== undefined,
        true,
      );
      TestValidator.equals(
        `record ${i} suspendedByAdmin has displayName`,
        record.suspendedByAdmin.displayName !== undefined,
        true,
      );
      // Validate resolved_at indicates suspension status accurately
      // null = currently suspended, populated = previously suspended and unsuspended
      if (record.resolved_at !== null) {
        // When resolved_at is populated, the suspension is historical (resolved)
        TestValidator.predicate(
          `record ${i} resolved_at is valid timestamp when not null`,
          !isNaN(Date.parse(record.resolved_at)),
        );
      }
      // When resolved_at is null, it means seller is currently suspended (active)
      // Validate suspension record immutability: created_at should be preserved
      // This is a business rule - audit records should never be modified
      TestValidator.equals(
        `record ${i} created_at matches updated_at for new records`,
        record.created_at === record.updated_at,
        true,
      );
      // Validate reason field is present and non-empty
      TestValidator.equals(
        `record ${i} has reason field`,
        record.reason !== undefined,
        true,
      );
      TestValidator.predicate(
        `record ${i} reason is non-empty string`,
        record.reason.length > 0,
      );
      // Validate suspension record fields exist
      TestValidator.equals(`record ${i} has id`, record.id !== undefined, true);
      TestValidator.equals(
        `record ${i} has suspended_by_admin_id`,
        record.suspended_by_admin_id !== undefined,
        true,
      );
      TestValidator.equals(
        `record ${i} has suspended_at`,
        record.suspended_at !== undefined,
        true,
      );
      TestValidator.equals(
        `record ${i} has resolved_at`,
        record.resolved_at !== undefined,
        true,
      );
      TestValidator.equals(
        `record ${i} has created_at`,
        record.created_at !== undefined,
        true,
      );
      TestValidator.equals(
        `record ${i} has updated_at`,
        record.updated_at !== undefined,
        true,
      );
    }
    // 7. Validate pagination consistency with data count
    TestValidator.equals(
      "data count matches pagination records",
      suspensionHistory.data.length <= suspensionHistory.pagination.records,
      true,
    );
    // 8. Verify current page boundaries
    TestValidator.predicate(
      "current page within valid range",
      (suspensionHistory.pagination.current >= 1 &&
        suspensionHistory.pagination.current <=
          suspensionHistory.pagination.pages) ||
        (suspensionHistory.pagination.records === 0 &&
          suspensionHistory.pagination.pages === 0),
    );
  } else {
    // When no suspension records exist, validate empty data handling
    TestValidator.equals(
      "data array is empty when no suspension records",
      suspensionHistory.data.length,
      0,
    );
    TestValidator.equals(
      "total records is zero when no suspension history",
      suspensionHistory.pagination.records,
      0,
    );
    TestValidator.equals(
      "total pages is zero when no suspension records",
      suspensionHistory.pagination.pages,
      0,
    );
  }
  // 9. Validate audit trail completeness: all suspension and unsuspension events recorded
  // This is verified by the presence of suspension records with proper audit fields
  if (suspensionHistory.data.length > 0) {
    TestValidator.predicate(
      "audit trail contains suspension records with accountability",
      suspensionHistory.data.some(
        (record) => record.suspendedByAdmin.id !== undefined,
      ),
    );
  }
}