import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sellers_index_with_approval_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Test filtering by pending status
  const pendingResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "pending",
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(pendingResult);
  // 3. Test filtering by approved status
  const approvedResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "approved",
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(approvedResult);
  // 4. Test filtering by rejected status
  const rejectedResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "rejected",
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(rejectedResult);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pending pagination current",
    pendingResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending pagination limit",
    pendingResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "approved pagination current",
    approvedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved pagination limit",
    approvedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "rejected pagination current",
    rejectedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected pagination limit",
    rejectedResult.pagination.limit,
    10,
  );
  // 6. Validate each filter returns correct subset by checking approval_status
  TestValidator.predicate("pending sellers have pending status", () =>
    pendingResult.data.every((seller) => seller.approval_status === "pending"),
  );
  TestValidator.predicate("approved sellers have approved status", () =>
    approvedResult.data.every(
      (seller) => seller.approval_status === "approved",
    ),
  );
  TestValidator.predicate("rejected sellers have rejected status", () =>
    rejectedResult.data.every(
      (seller) => seller.approval_status === "rejected",
    ),
  );
  // 7. Validate rejection_reason is populated for rejected sellers
  const rejectedWithReason = rejectedResult.data.filter(
    (seller) =>
      seller.rejection_reason !== null && seller.rejection_reason !== undefined,
  );
  const rejectedWithoutReason = rejectedResult.data.filter(
    (seller) =>
      seller.rejection_reason === null || seller.rejection_reason === undefined,
  );
  TestValidator.equals(
    "rejected sellers count",
    rejectedResult.data.length,
    rejectedWithReason.length + rejectedWithoutReason.length,
  );
  // 8. Validate pagination total records
  TestValidator.predicate(
    "pending has valid total",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved has valid total",
    approvedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "rejected has valid total",
    rejectedResult.pagination.records >= 0,
  );
  // 9. Validate data is array
  TestValidator.predicate(
    "pending is array",
    Array.isArray(pendingResult.data),
  );
  TestValidator.predicate(
    "approved is array",
    Array.isArray(approvedResult.data),
  );
  TestValidator.predicate(
    "rejected is array",
    Array.isArray(rejectedResult.data),
  );
  // 10. Validate data limits
  TestValidator.predicate(
    "pending limit not exceeded",
    pendingResult.data.length <= pendingResult.pagination.limit,
  );
  TestValidator.predicate(
    "approved limit not exceeded",
    approvedResult.data.length <= approvedResult.pagination.limit,
  );
  TestValidator.predicate(
    "rejected limit not exceeded",
    rejectedResult.data.length <= rejectedResult.pagination.limit,
  );
}