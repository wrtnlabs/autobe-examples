import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_seller_deletion_audited_in_admin_logs(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const actingAdminId = adminAuthorized.id;

  // 2. Locate an existing seller via admin sellers index
  const sellerSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSeller.IRequest;

  const sellerPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: sellerSearchRequest,
    });
  typia.assert(sellerPage);

  TestValidator.predicate(
    "there must be at least one seller to delete",
    sellerPage.data.length > 0,
  );

  const sellerToDelete: IShoppingMallSeller.ISummary = sellerPage.data[0];

  // 3. Delete the chosen seller
  const deletedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.erase(connection, {
      sellerId: sellerToDelete.id,
    });
  typia.assert(deletedSeller);

  TestValidator.equals(
    "deleted seller id should match target seller id",
    deletedSeller.id,
    sellerToDelete.id,
  );

  // 4. Query admin audit logs for a record corresponding to the deletion
  const auditSearchRequest = {
    shopping_mall_admin_id: actingAdminId,
    action_type: null,
    entity_type: "seller",
    entity_id: deletedSeller.id,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: null,
    to_created_at: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const auditPage: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: auditSearchRequest,
    });
  typia.assert(auditPage);

  // 5. Find a matching audit log entry
  const matchingAudit = auditPage.data.find((log) => {
    const matchesEntity =
      log.entity_type === "seller" && log.entity_id === deletedSeller.id;
    const matchesAdmin =
      log.shopping_mall_admin_id === actingAdminId ||
      (log.admin !== undefined && log.admin.id === actingAdminId);
    return matchesEntity && matchesAdmin;
  });

  TestValidator.predicate(
    "audit log entry must exist for deleted seller and acting admin",
    matchingAudit !== undefined,
  );

  if (!matchingAudit) return;

  // 6. Validate key invariants on the audit log entry
  TestValidator.equals(
    "audit log entity_type should be 'seller'",
    matchingAudit.entity_type,
    "seller",
  );

  TestValidator.equals(
    "audit log entity_id should match deleted seller id",
    matchingAudit.entity_id,
    deletedSeller.id,
  );

  if (
    matchingAudit.shopping_mall_admin_id !== null &&
    matchingAudit.shopping_mall_admin_id !== undefined
  ) {
    TestValidator.equals(
      "audit log shopping_mall_admin_id should match acting admin id when present",
      matchingAudit.shopping_mall_admin_id,
      actingAdminId,
    );
  }

  if (matchingAudit.admin !== undefined) {
    typia.assert(matchingAudit.admin);
    TestValidator.equals(
      "audit log admin summary id should match acting admin id when admin is present",
      matchingAudit.admin.id,
      actingAdminId,
    );
  }

  // created_at has already been validated structurally by typia.assert via the page type,
  // but we can still rely on it to exist as part of business semantics.
  TestValidator.predicate(
    "audit log must have a created_at timestamp",
    !!matchingAudit.created_at,
  );
}
