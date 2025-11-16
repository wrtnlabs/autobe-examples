import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validates admin creation of new shipping/logistics partner entries and
 * business rule enforcement for duplicates.
 *
 * 1. Registers a new platform admin (random test values).
 * 2. Creates a valid, unique shipping partner (unique name/code, "active" status,
 *    description present).
 * 3. Checks the response for record correctness and audit fields.
 * 4. Attempts registration with duplicate name (but different code) - expects
 *    error.
 * 5. Attempts registration with duplicate code (but different name) - expects
 *    error.
 * 6. Attempts registration with both name and code duplicated - expects error.
 */
export async function test_api_shipping_partner_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a unique partner
  const baseName = `Partner ${RandomGenerator.alphaNumeric(8)}`;
  const baseCode = RandomGenerator.alphaNumeric(10);
  const status = "active";
  const description = RandomGenerator.paragraph({ sentences: 8 });
  const createBody = {
    partner_name: baseName,
    partner_code: baseCode,
    status,
    description,
  } satisfies IShoppingMallShippingPartner.ICreate;
  const partner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      { body: createBody },
    );
  typia.assert(partner);
  TestValidator.equals("partner_name matches", partner.partner_name, baseName);
  TestValidator.equals("partner_code matches", partner.partner_code, baseCode);
  TestValidator.equals("status matches", partner.status, status);
  TestValidator.equals("description matches", partner.description, description);
  TestValidator.predicate(
    "partner id is a valid uuid",
    typeof partner.id === "string" && partner.id.length > 0,
  );
  TestValidator.predicate(
    "audit created_at set",
    typeof partner.created_at === "string" && partner.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit updated_at set",
    typeof partner.updated_at === "string" && partner.updated_at.length > 0,
  );
  TestValidator.equals("not deleted", partner.deleted_at, null);

  // 3. Try duplicate name (different code)
  const duplicateNameBody = {
    partner_name: baseName, // duplicate name
    partner_code: RandomGenerator.alphaNumeric(12),
    status,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  await TestValidator.error(
    "Should fail to register duplicate partner_name",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.create(
        connection,
        { body: duplicateNameBody },
      );
    },
  );

  // 4. Try duplicate code (different name)
  const duplicateCodeBody = {
    partner_name: `${baseName}-other`,
    partner_code: baseCode, // duplicate code
    status,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  await TestValidator.error(
    "Should fail to register duplicate partner_code",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.create(
        connection,
        { body: duplicateCodeBody },
      );
    },
  );

  // 5. Try duplicate name and code
  const duplicateBothBody = {
    partner_name: baseName,
    partner_code: baseCode,
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 7 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  await TestValidator.error(
    "Should fail to register duplicate partner_name and partner_code",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.create(
        connection,
        { body: duplicateBothBody },
      );
    },
  );
}
