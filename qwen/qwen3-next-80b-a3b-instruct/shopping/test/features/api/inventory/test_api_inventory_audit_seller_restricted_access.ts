import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_audit_seller_restricted_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create two separate seller accounts
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Response = typia.assert(await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: seller1Password,
    } satisfies IShoppingMallSeller.IJoin,
  }));
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Response = typia.assert(await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: seller2Password,
    } satisfies IShoppingMallSeller.IJoin,
  }));
  // Step 3: Admin logs in to add inventory records
  await authorize_admin_login(adminConnection, {
    body: {
      email: seller1Response.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 4: Admin adds inventory records for two different variant IDs
  // We'll create variant IDs as UUIDs that represent different sellers
  const variant1Id = typia.random<string & tags.Format<"uuid">>(); // This will be associated with seller1
  const variant2Id = typia.random<string & tags.Format<"uuid">>(); // This will be associated with seller2
  // Admin adds inventory record for seller1's variant
  await api.functional.shoppingMall.admin.inventory.records.index(
    adminConnection,
    {
      body: {
        variantId: variant1Id,
        sourceType: "restock",
        reason: "Initial stock addition for seller1",
      } satisfies IShoppingMallInventoryRecord.IRequest,
    },
  );
  // Admin adds inventory record for seller2's variant
  await api.functional.shoppingMall.admin.inventory.records.index(
    adminConnection,
    {
      body: {
        variantId: variant2Id,
        sourceType: "restock",
        reason: "Initial stock addition for seller2",
      } satisfies IShoppingMallInventoryRecord.IRequest,
    },
  );
  // Step 5: Seller 1 attempts to audit inventory records
  // Authenticate seller1 for access
  await authorize_seller_login(seller1Connection, {
    body: {
      email: seller1Response.email,
      password: seller1Password, // Use the saved password
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Seller 1 attempts to access ALL inventory records
  const allRecords =
    await api.functional.shoppingMall.admin.inventory.records.index(
      seller1Connection,
      {
        body: {},
      },
    );
  typia.assert(allRecords);
  // Validate seller1 only sees their own inventory records
  // seller1 should see record for variant1
  const seller1Records = allRecords.data.filter(
    (record) => record.variantId === variant1Id,
  );
  TestValidator.equals(
    "seller1 sees their own product inventory",
    seller1Records.length,
    1,
  );
  // seller1 should NOT see seller2's inventory records
  const seller2Records = allRecords.data.filter(
    (record) => record.variantId === variant2Id,
  );
  TestValidator.equals(
    "seller1 cannot see other seller's inventory",
    seller2Records.length,
    0,
  );
  // Seller 1 attempts to access specific variant records for their own product
  const ownVariantRecords =
    await api.functional.shoppingMall.admin.inventory.records.index(
      seller1Connection,
      {
        body: {
          variantId: variant1Id,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(ownVariantRecords);
  TestValidator.equals(
    "seller1 can access their variant inventory",
    ownVariantRecords.data.length,
    1,
  );
  // Seller 1 attempts to access another seller's variant records
  const otherVariantRecords =
    await api.functional.shoppingMall.admin.inventory.records.index(
      seller1Connection,
      {
        body: {
          variantId: variant2Id,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(otherVariantRecords);
  TestValidator.equals(
    "seller1 cannot access other seller's variant inventory",
    otherVariantRecords.data.length,
    0,
  );
  // Step 6: Admin can access all inventory records
  await authorize_admin_login(adminConnection, {
    body: {
      email: seller1Response.email,
      password: seller1Password, // Use the saved password
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const adminAllRecords =
    await api.functional.shoppingMall.admin.inventory.records.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(adminAllRecords);
  TestValidator.equals(
    "admin can see all inventory records",
    adminAllRecords.data.length,
    2,
  );
}