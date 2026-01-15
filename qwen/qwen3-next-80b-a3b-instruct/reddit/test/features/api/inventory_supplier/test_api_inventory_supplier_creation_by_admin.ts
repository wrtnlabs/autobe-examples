import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_supplier_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the utility function (highest priority)
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Prepare complete supplier creation data following ICommunityPlatformInventorySuppliers.ICreate
  const supplierData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    contact_email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile("+1"),
    supplier_type: RandomGenerator.pick([
      "manufacturer",
      "distributor",
      "wholesaler",
      "retailer",
    ] as const),
    address_line_1:
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }) +
      " " +
      RandomGenerator.alphaNumeric(2),
    address_line_2: undefined,
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    country: "US",
    // Generate postal code using only MinLength<1> & MaxLength<20> constraints
    // Since US postal codes are 5 or 9 digits, we generate a random 5-digit number or 9-digit number
    postal_code: (() => {
      // Generate a 5-digit postal code
      const base = typia.random<
        number & tags.Type<"uint32"> & tags.Maximum<99999>
      >();
      // 50% chance to add 4-digit extension
      if (Math.random() > 0.5) {
        const extension = typia.random<
          number & tags.Type<"uint32"> & tags.Maximum<9999>
        >();
        return `${base.toString().padStart(5, "0")}-${extension.toString().padStart(4, "0")}`;
      }
      return base.toString().padStart(5, "0");
    })(),
    website: typia.random<string & tags.Format<"uri">>(),
    payment_terms: "Net 30",
    credit_limit: typia.random<
      number & tags.Minimum<0> & tags.Maximum<1000000>
    >(),
    delivery_capabilities: ArrayUtil.repeat(
      RandomGenerator.pick([3, 4, 5] as const),
      () =>
        RandomGenerator.pick([
          "standard",
          "express",
          "overnight",
          "cold-chain",
          "hazardous-materials",
          "international",
          "local",
        ] as const),
    ),
    compliance_certifications: ArrayUtil.repeat(
      RandomGenerator.pick([2, 3, 4] as const),
      () =>
        RandomGenerator.pick([
          "iso9001",
          "iso14001",
          "fda",
          "gmp",
          "bcorp",
          "fair-trade",
        ] as const),
    ),
    account_manager_name: RandomGenerator.name(),
    account_manager_email: typia.random<string & tags.Format<"email">>(),
    account_manager_phone: RandomGenerator.mobile("+1"),
    bank_account_details: "Account#: 9876543210, Routing#: 111000025",
    notes: undefined,
    password: "SecurePass123!" + RandomGenerator.alphaNumeric(4),
    href: "https://example.com/admin/inventory-suppliers/new",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformInventorySuppliers.ICreate;
  // Create inventory supplier using the utility function (highest priority)
  const createdSupplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      { body: supplierData },
    );
  // Validate the returned supplier structure
  typia.assert(createdSupplier);
  // Perform detailed assertions on the created supplier
  TestValidator.equals(
    "supplier name matches",
    createdSupplier.legal_name,
    supplierData.name,
  );
  TestValidator.equals(
    "contact email matches",
    createdSupplier.contact_email,
    supplierData.contact_email,
  );
  TestValidator.equals(
    "contact phone matches",
    createdSupplier.contact_phone,
    supplierData.contact_phone,
  );
  TestValidator.equals(
    "supplier type matches",
    createdSupplier.supplier_type,
    supplierData.supplier_type,
  );
  TestValidator.equals(
    "address line 1 matches",
    createdSupplier.address_line1,
    supplierData.address_line_1,
  );
  TestValidator.equals("city matches", createdSupplier.city, supplierData.city);
  TestValidator.equals(
    "state/province matches",
    createdSupplier.state_province,
    supplierData.state_province,
  );
  TestValidator.equals(
    "country matches",
    createdSupplier.country,
    supplierData.country,
  );
  TestValidator.equals(
    "postal code matches",
    createdSupplier.postal_code,
    supplierData.postal_code,
  );
  TestValidator.equals(
    "approval status is approved",
    createdSupplier.approval_status,
    "approved",
  );
  TestValidator.equals("is_active is true", createdSupplier.is_active, true);
  TestValidator.predicate("ID is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdSupplier.id,
    ),
  );
  TestValidator.predicate("created_at is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdSupplier.created_at,
    ),
  );
  TestValidator.predicate("updated_at is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdSupplier.updated_at,
    ),
  );
}
