import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Verify admin detail retrieval of a shipping partner by partner code.
 *
 * 1. Register and authenticate a platform admin
 * 2. Create a new shipping partner with distinct code and name
 * 3. Retrieve the partner by code with admin privilege
 * 4. Assert all descriptive and operational fields
 * 5. Assert detail endpoint enforces admin authentication
 */
export async function test_api_shipping_partner_details_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create a shipping partner
  const partnerName = RandomGenerator.name();
  const partnerCode = RandomGenerator.alphaNumeric(10);
  const status = RandomGenerator.pick([
    "active",
    "inactive",
    "deprecated",
  ] as const);
  const description = RandomGenerator.paragraph();
  const partnerCreated: IShoppingMallShippingPartner =
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
  typia.assert(partnerCreated);

  // 3. Retrieve the shipping partner details by code
  const partnerDetail: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.at(connection, {
      partnerCode,
    });
  typia.assert(partnerDetail);

  // 4. Assert all fields against creation and system-populated fields
  TestValidator.equals(
    "partner id should match",
    partnerDetail.id,
    partnerCreated.id,
  );
  TestValidator.equals(
    "partner_name should match",
    partnerDetail.partner_name,
    partnerName,
  );
  TestValidator.equals(
    "partner_code should match",
    partnerDetail.partner_code,
    partnerCode,
  );
  TestValidator.equals("status should match", partnerDetail.status, status);
  TestValidator.equals(
    "description should match",
    partnerDetail.description,
    description,
  );
  TestValidator.equals(
    "created_at should match",
    partnerDetail.created_at,
    partnerCreated.created_at,
  );
  TestValidator.predicate(
    "updated_at is ISO8601 and matches (not before created_at)",
    partnerDetail.updated_at >= partnerDetail.created_at,
  );
  if (
    partnerCreated.deleted_at !== null &&
    partnerCreated.deleted_at !== undefined
  ) {
    TestValidator.equals(
      "deleted_at should match if present",
      partnerDetail.deleted_at,
      partnerCreated.deleted_at,
    );
  } else {
    TestValidator.equals(
      "deleted_at should be null/undefined when not soft-deleted",
      partnerDetail.deleted_at,
      partnerCreated.deleted_at,
    );
  }

  // 5. Ensure non-admin cannot access the detail endpoint (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access admin shipping partner detail",
    async () => {
      await api.functional.shoppingMall.admin.shippingPartners.at(unauthConn, {
        partnerCode,
      });
    },
  );
}
