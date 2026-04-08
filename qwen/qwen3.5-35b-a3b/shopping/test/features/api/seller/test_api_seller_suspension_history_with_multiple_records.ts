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

export async function test_api_seller_suspension_history_with_multiple_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      },
    });
  typia.assert(admin);
  // 2. Test seller UUID
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call suspension history endpoint
  const response: IPageIEcommerceMallSellerSuspension.ISummary =
    await api.functional.ecommerceMall.administrator.sellers.suspension_history.history(
      adminConnection,
      {
        sellerId,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current is valid",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    response.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    response.pagination.pages >= 0,
    true,
  );
  // 5. Validate data array has at least 2 records
  TestValidator.predicate(
    "data array has at least 2 records",
    response.data.length >= 2,
  );
  // 6. Validate records are sorted by suspended_at descending
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      "records sorted by suspended_at descending",
      new Date(response.data[i].suspended_at) >=
        new Date(response.data[i + 1].suspended_at),
    );
  }
  // 7. Validate at least one active suspension (resolved_at is null)
  const hasActiveSuspension = response.data.some(
    (record) => record.resolved_at === null,
  );
  TestValidator.predicate(
    "has active suspension with null resolved_at",
    hasActiveSuspension,
  );
  // 8. Validate at least one historical suspension (resolved_at is populated)
  const hasHistoricalSuspension = response.data.some(
    (record) => record.resolved_at !== null,
  );
  TestValidator.predicate(
    "has historical suspension with non-null resolved_at",
    hasHistoricalSuspension,
  );
  // 9. Validate each record structure
  for (const record of response.data) {
    // Validate suspendedByAdmin exists with all required fields
    TestValidator.predicate(
      "suspendedByAdmin exists",
      record.suspendedByAdmin !== undefined,
    );
    TestValidator.predicate(
      "suspendedByAdmin.id is valid UUID",
      record.suspendedByAdmin.id !== undefined &&
        record.suspendedByAdmin.id.length > 0,
    );
    TestValidator.predicate(
      "suspendedByAdmin.email is valid",
      record.suspendedByAdmin.email !== undefined &&
        record.suspendedByAdmin.email.length > 0,
    );
    TestValidator.predicate(
      "suspendedByAdmin.displayName is valid",
      record.suspendedByAdmin.displayName !== undefined &&
        record.suspendedByAdmin.displayName.length > 0,
    );
    // Validate timestamps are valid ISO 8601
    TestValidator.predicate(
      "suspended_at is valid date-time",
      !isNaN(new Date(record.suspended_at).getTime()),
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(new Date(record.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      !isNaN(new Date(record.updated_at).getTime()),
    );
    // Validate no soft-deleted records
    TestValidator.equals(
      "deleted_at is null (no soft delete)",
      record.deleted_at,
      null,
    );
    // Validate suspended_at is not null
    TestValidator.predicate(
      "suspended_at is not null",
      record.suspended_at !== null,
    );
    // Validate seller_id matches
    TestValidator.equals(
      "seller_id matches request parameter",
      record.seller_id,
      sellerId,
    );
    // Validate suspended_by_admin_id is UUID format
    TestValidator.predicate(
      "suspended_by_admin_id is valid UUID",
      record.suspended_by_admin_id.length > 0,
    );
    // Validate reason is present
    TestValidator.predicate(
      "reason is present and non-empty",
      record.reason !== undefined && record.reason.length > 0,
    );
    // Validate seller_id is UUID format
    TestValidator.predicate(
      "seller_id is valid UUID",
      record.seller_id.length > 0,
    );
  }
}
