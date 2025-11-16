import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate hard deletion of a shipping partner by admin.
 *
 * 1. Register a new admin via /auth/admin/join, obtaining an authenticated admin
 *    session.
 * 2. Register a new shipping partner as admin via
 *    /shoppingMall/admin/shippingPartners.
 * 3. Hard delete the newly created shipping partner via
 *    /shoppingMall/admin/shippingPartners/{partnerCode}.
 * 4. (Optional) Attempt to get or delete the same partner again to verify it's
 *    removed.
 * 5. Attempt to hard delete a partner as an unauthenticated user; expect failure.
 */
export async function test_api_shipping_partner_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // Now connection is authenticated as this admin.

  // 2. Register a shipping partner as admin
  const partnerCode = RandomGenerator.alphaNumeric(8);
  const partnerName = RandomGenerator.name();
  const shippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: partnerName,
          partner_code: partnerCode,
          status: RandomGenerator.pick([
            "active",
            "inactive",
            "deprecated",
          ] as const),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(shippingPartner);
  TestValidator.equals(
    "shipping partner code should match",
    shippingPartner.partner_code,
    partnerCode,
  );

  // 3. Hard delete the shipping partner as admin
  await api.functional.shoppingMall.admin.shippingPartners.erase(connection, {
    partnerCode,
  });

  // 4. Attempt to delete again as admin, should error (already removed)
  await TestValidator.error(
    "deleting already deleted partner should fail",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.erase(
        connection,
        {
          partnerCode,
        },
      );
    },
  );

  // 5. Register another shipping partner and try to delete as unauthenticated
  const partnerCode2 = RandomGenerator.alphaNumeric(8);
  const partnerName2 = RandomGenerator.name();
  const partner2 =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: partnerName2,
          partner_code: partnerCode2,
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(partner2);
  TestValidator.equals(
    "second shipping partner code should match",
    partner2.partner_code,
    partnerCode2,
  );

  // Make an unauthenticated connection (no headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "deletion without admin authentication should fail",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.erase(
        unauthConnection,
        {
          partnerCode: partnerCode2,
        },
      );
    },
  );
}
