import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryProcurementOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryProcurementOrder";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_procurement_orders_paginated_search_with_supplier_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin to access procurement order filtering
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Validate search endpoint accepts valid request with supplier_code
  // We cannot create procurement orders, so we test only the search functionality
  // with a plausible supplier code
  const supplierCode = "SUPP-001";
  const response =
    await api.functional.communityPlatform.admin.inventory_procurement_orders.index(
      adminConnection,
      {
        body: {
          supplier_code: supplierCode,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(response);
  // Step 3: Validate response structure
  TestValidator.equals(
    "response includes pagination object",
    true,
    response.pagination !== undefined,
  );
  TestValidator.equals(
    "response includes data array",
    true,
    response.data !== undefined,
  );
}
