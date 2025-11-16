import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test that an admin can create a logistics/shipping partner via the admin
 * endpoint.
 *
 * This workflow validates admin authentication and registration, and then
 * exercises the creation of a shipping partner with unique partner_name and
 * partner_code, and valid status/description.
 *
 * Steps:
 *
 * 1. Register a new admin to get valid admin session (since only admin can create
 *    shipping partners)
 * 2. Prepare a unique set of partner_name and partner_code
 * 3. Make the POST /shoppingMall/admin/shippingPartners API call using valid
 *    values for all required fields
 * 4. Verify that the shipping partner is created and all response fields match the
 *    input, including compliance with allowed status values and uniqueness
 *    enforcement
 * 5. Test that another attempt with the same partner_code fails (uniqueness
 *    constraint at business rule layer)
 */
export async function test_api_shipping_partner_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName: string = RandomGenerator.name(2);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Prepare unique partner_name and partner_code; use business-allowed status
  const partnerName: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const partnerCode: string = RandomGenerator.alphaNumeric(10);
  const statusOptions = ["active", "inactive", "deprecated"] as const;
  const status = RandomGenerator.pick(statusOptions);
  const description: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 4,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 10,
  });

  // 3. Create shipping partner
  const shippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: partnerName,
          partner_code: partnerCode,
          status,
          description,
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(shippingPartner);
  TestValidator.equals(
    "partner_name matches",
    shippingPartner.partner_name,
    partnerName,
  );
  TestValidator.equals(
    "partner_code matches",
    shippingPartner.partner_code,
    partnerCode,
  );
  TestValidator.equals("status matches", shippingPartner.status, status);
  TestValidator.equals(
    "description matches",
    shippingPartner.description,
    description,
  );

  // 4. Attempt to create partner again with duplicate partner_code (should error)
  await TestValidator.error("duplicate partner_code should fail", async () => {
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          partner_code: partnerCode,
          status,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  });
}
