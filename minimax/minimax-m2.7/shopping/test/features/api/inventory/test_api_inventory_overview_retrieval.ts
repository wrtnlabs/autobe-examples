import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_inventory_overview_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as SuperAdmin to approve admin requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 2. Submit admin request as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminRequest = await authorize_admin_join(sellerConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/admin-request" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. SuperAdmin approves the admin request
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 4. Login as approved admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IEcommerceMallAdmin.ILogin = {
    email: adminRequest.email,
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://example.com/admin-login" as string & tags.Format<"uri">,
    referrer: "https://example.com" as string & tags.Format<"uri">,
  } satisfies IEcommerceMallAdmin.ILogin;
  await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  // 5. Call inventory overview endpoint
  const inventoryOverview =
    await api.functional.ecommerceMall.admin.inventory.overview.at(
      adminConnection,
    );
  typia.assert(inventoryOverview);
  // 6. Validate response structure - all required fields present
  TestValidator.equals(
    "totalVariantsCount is a number",
    typeof inventoryOverview.totalVariantsCount,
    "number",
  );
  TestValidator.equals(
    "totalStockQuantity is a number",
    typeof inventoryOverview.totalStockQuantity,
    "number",
  );
  TestValidator.equals(
    "totalStockValue is a number",
    typeof inventoryOverview.totalStockValue,
    "number",
  );
  TestValidator.equals(
    "outOfStockCount is a number",
    typeof inventoryOverview.outOfStockCount,
    "number",
  );
  TestValidator.equals(
    "lowStockCount is a number",
    typeof inventoryOverview.lowStockCount,
    "number",
  );
  TestValidator.equals(
    "inStockCount is a number",
    typeof inventoryOverview.inStockCount,
    "number",
  );
  TestValidator.predicate(
    "lowStockVariants is an array",
    Array.isArray(inventoryOverview.lowStockVariants),
  );
  TestValidator.predicate(
    "recentChanges is an array",
    Array.isArray(inventoryOverview.recentChanges),
  );
  // 7. Validate business logic: totalVariantsCount = outOfStockCount + lowStockCount + inStockCount
  const calculatedTotal =
    inventoryOverview.outOfStockCount +
    inventoryOverview.lowStockCount +
    inventoryOverview.inStockCount;
  TestValidator.equals(
    "total variants equals sum of stock status counts",
    inventoryOverview.totalVariantsCount,
    calculatedTotal,
  );
  // 8. Validate lowStockVariants structure and ordering
  for (const variant of inventoryOverview.lowStockVariants) {
    TestValidator.equals("variant has id", typeof variant.id, "string");
    TestValidator.equals(
      "variant has skuCode",
      typeof variant.skuCode,
      "string",
    );
    TestValidator.equals(
      "variant has productName",
      typeof variant.productName,
      "string",
    );
    TestValidator.equals(
      "variant has quantity (1-10 for low stock)",
      variant.quantity >= 1 && variant.quantity <= 10,
      true,
    );
    TestValidator.equals(
      "variant has price (number or null)",
      typeof variant.price === "number" || variant.price === null,
      true,
    );
  }
  // Validate lowStockVariants ordered by quantity ascending
  for (let i = 1; i < inventoryOverview.lowStockVariants.length; i++) {
    TestValidator.predicate(
      "lowStockVariants ordered by quantity ascending",
      inventoryOverview.lowStockVariants[i].quantity >=
        inventoryOverview.lowStockVariants[i - 1].quantity,
    );
  }
  // 9. Validate lowStockVariants array limit (max 20)
  TestValidator.predicate(
    "lowStockVariants max 20 items",
    inventoryOverview.lowStockVariants.length <= 20,
  );
  // 10. Validate recentChanges structure
  for (const change of inventoryOverview.recentChanges) {
    TestValidator.equals(
      "change has quantityChange",
      typeof change.quantityChange,
      "number",
    );
    TestValidator.equals("change has reason", typeof change.reason, "string");
    TestValidator.equals(
      "change has createdAt (date-time format)",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(change.createdAt),
      true,
    );
    TestValidator.equals(
      "change has variantSku",
      typeof change.variantSku,
      "string",
    );
    TestValidator.equals(
      "change has productName",
      typeof change.productName,
      "string",
    );
  }
  // 11. Validate recentChanges array limit (max 10)
  TestValidator.predicate(
    "recentChanges max 10 items",
    inventoryOverview.recentChanges.length <= 10,
  );
}