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
export async function test_api_inventory_supplier_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Create a new supplier using the admin connection and store the name
  const supplierName = RandomGenerator.name();
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: supplierName,
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer" as const,
          address_line_1: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US", // Required ISO 3166-1 alpha-2
          postal_code: typia.random<
            string & tags.Pattern<"^[0-9]{5}(?:-[0-9]{4})?$">
          >(),
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30", // Standard industry term
          credit_limit: 100000, // Logical default value
          delivery_capabilities: ["standard"] as const, // Fixed to valid enum value
          compliance_certifications: ["iso9001"] as const,
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: `Bank Account: ${RandomGenerator.alphaNumeric(10)}; Routing: ${RandomGenerator.alphaNumeric(9)}`, // Required property in ICreate
          notes: "Sample supplier with automated test data",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 3: Retrieve the supplier using the admin connection
  const retrievedSupplier =
    await api.functional.communityPlatform.admin.inventory_suppliers.at(
      adminConnection,
      {
        supplierId: supplier.id,
      },
    );
  typia.assert(retrievedSupplier);
  // Step 4: Validate retrieved supplier data matches scenario requirements
  TestValidator.equals(
    "supplier legal_name matches created name",
    retrievedSupplier.legal_name,
    supplierName,
  );
  TestValidator.equals(
    "supplier contact_email matches created email",
    retrievedSupplier.contact_email,
    supplier.contact_email,
  );
  TestValidator.equals(
    "supplier approval_status is approved",
    retrievedSupplier.approval_status,
    "approved",
  );
}
