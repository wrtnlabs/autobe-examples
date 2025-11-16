import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate update of shipping partner by admin immediately after creation.
 *
 * 1. Register a new admin.
 * 2. Create new shipping partner with unique name/code/status/description.
 * 3. Update the partner to new name, status, description (all permitted fields).
 * 4. Check response reflects changes and audit fields are correct.
 * 5. Confirm uniqueness and audit rules.
 * 6. Optionally attempt update to conflicting code/name to trigger business error.
 */
export async function test_api_shipping_partner_update_after_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create shipping partner
  const partnerName = RandomGenerator.name();
  const partnerCode = RandomGenerator.alphaNumeric(10);
  const shippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: partnerName,
          partner_code: partnerCode,
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(shippingPartner);

  // 3. Update the partner (to a new name, new status, new description)
  const updateName = RandomGenerator.name();
  const updateStatus = "inactive";
  const updateDescription = RandomGenerator.paragraph({ sentences: 8 });

  const updatedPartner =
    await api.functional.shoppingMall.admin.shippingPartners.update(
      connection,
      {
        partnerCode: partnerCode,
        body: {
          partner_name: updateName,
          status: updateStatus,
          description: updateDescription,
        } satisfies IShoppingMallShippingPartner.IUpdate,
      },
    );
  typia.assert(updatedPartner);

  // 4. Business assertions: all updated fields are reflected
  TestValidator.equals(
    "updated partner name",
    updatedPartner.partner_name,
    updateName,
  );
  TestValidator.equals("updated status", updatedPartner.status, updateStatus);
  TestValidator.equals(
    "updated description",
    updatedPartner.description,
    updateDescription,
  );
  TestValidator.equals(
    "partner code remains unchanged",
    updatedPartner.partner_code,
    partnerCode,
  );
  TestValidator.notEquals(
    "updated_at is different after update",
    updatedPartner.updated_at,
    shippingPartner.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updatedPartner.created_at,
    shippingPartner.created_at,
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    updatedPartner.updated_at >= updatedPartner.created_at,
  );
  // 5. Negative: try updating partner_name to an existing one (conflict)
  const anotherPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.name(),
          partner_code: RandomGenerator.alphaNumeric(10),
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(anotherPartner);

  await TestValidator.error(
    "updating code to an existing partner's code should fail",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.update(
        connection,
        {
          partnerCode: partnerCode,
          body: {
            partner_code: anotherPartner.partner_code,
          } satisfies IShoppingMallShippingPartner.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "updating name to an existing partner's name should fail",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.update(
        connection,
        {
          partnerCode: partnerCode,
          body: {
            partner_name: anotherPartner.partner_name,
          } satisfies IShoppingMallShippingPartner.IUpdate,
        },
      );
    },
  );
}
