import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully retrieve a paginated list
 * of inventory records for a specific product variant. The test verifies that
 * the response includes pagination metadata and a data array containing inventory
 * records with id, quantityChange, reason, and createdAt fields.
 */
export async function test_api_inventory_records_super_admin_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a variant ID for testing
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the inventory records listing endpoint with pagination
  const response =
    await api.functional.ecommerceMall.superAdmin.productVariants.inventoryRecords.index(
      superAdminConnection,
      {
        variantId,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  // 4. Validate response with typia.assert - this validates the complete structure
  // including pagination metadata (current, limit, records, pages) and data array
  typia.assert(response);
  // 5. Validate data array exists and is an array
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  // 6. Validate inventory record fields in each record
  for (const record of response.data) {
    TestValidator.equals("has valid id", record.id !== undefined, true);
    TestValidator.equals(
      "has valid quantityChange",
      typeof record.quantityChange === "number",
      true,
    );
    TestValidator.equals(
      "has valid reason",
      typeof record.reason === "string",
      true,
    );
    TestValidator.equals(
      "has valid createdAt",
      record.createdAt !== undefined && record.createdAt !== null,
      true,
    );
  }
}
