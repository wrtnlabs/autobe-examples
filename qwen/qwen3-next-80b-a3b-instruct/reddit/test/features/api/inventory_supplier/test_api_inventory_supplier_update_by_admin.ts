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
export async function test_api_inventory_supplier_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthResult);
  // Step 2: Create a supplier record using generation function (since it's available for POST /communityPlatform/admin/inventory-suppliers)
  const supplierData = {
    name: RandomGenerator.name(),
    contact_email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    supplier_type: "manufacturer" as const,
    address_line_1: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    country: "US",
    postal_code: typia.random<string & tags.Pattern<"^\\d{5}$">>(),
    website: "https://example.com",
    payment_terms: "Net 30",
    credit_limit: 50000,
    delivery_capabilities: [] as (
      | "standard"
      | "express"
      | "overnight"
      | "cold-chain"
      | "hazardous-materials"
      | "large-volume"
      | "international"
      | "local"
    )[],
    compliance_certifications: [] as (
      | "iso9001"
      | "iso14001"
      | "iso45001"
      | "fda"
      | "haccp"
      | "gmp"
      | "bcorp"
      | "fsc"
      | "fair-trade"
      | "other"
    )[],
    account_manager_name: RandomGenerator.name(),
    account_manager_email: typia.random<string & tags.Format<"email">>(),
    account_manager_phone: RandomGenerator.mobile(),
    bank_account_details: "John Doe, 1234567890, Bank of America",
    password: "SecurePass123!",
    ip: null,
    href: "https://example.com/admin/suppliers/new",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformInventorySuppliers.ICreate;
  const createdSupplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      { body: supplierData },
    );
  typia.assert(createdSupplier);
  // Step 3: Update the supplier with new contact information and certifications
  const updateData = {
    legal_name: `${createdSupplier.legal_name} Updated`,
    contact_email: typia.random<string & tags.Format<"email">>(),
    certifications: ["ISO 9001", "ISO 14001"] as (string &
      tags.MinLength<1> &
      tags.MaxLength<100>)[],
    contact_person: createdSupplier.contact_person,
    contact_phone: createdSupplier.contact_phone,
    address_line1: createdSupplier.address_line1,
    city: createdSupplier.city,
    state_province: createdSupplier.state_province,
    country: createdSupplier.country,
    postal_code: createdSupplier.postal_code,
    website: createdSupplier.website,
    approval_status: createdSupplier.approval_status,
    is_active: createdSupplier.is_active,
  } satisfies ICommunityPlatformInventorySuppliers.IUpdate;
  const updatedSupplier =
    await api.functional.communityPlatform.admin.inventory_suppliers.update(
      adminConnection,
      {
        supplierId: createdSupplier.id,
        body: updateData,
      },
    );
  typia.assert(updatedSupplier);
  // Step 4: Validate updates and that unchanged fields remain correct
  TestValidator.equals(
    "legal_name was updated",
    updatedSupplier.legal_name,
    updateData.legal_name,
  );
  TestValidator.equals(
    "contact_email was updated",
    updatedSupplier.contact_email,
    updateData.contact_email,
  );
  TestValidator.equals(
    "certifications were updated",
    updatedSupplier.certifications,
    updateData.certifications,
  );
  // Validate that unchanged fields from the original record are preserved
  TestValidator.equals(
    "id remained the same",
    updatedSupplier.id,
    createdSupplier.id,
  );
  TestValidator.equals(
    "supplier_type unchanged",
    updatedSupplier.supplier_type,
    createdSupplier.supplier_type,
  );
  TestValidator.equals(
    "address_line1 unchanged",
    updatedSupplier.address_line1,
    createdSupplier.address_line1,
  );
  TestValidator.equals(
    "city unchanged",
    updatedSupplier.city,
    createdSupplier.city,
  );
  TestValidator.equals(
    "state_province unchanged",
    updatedSupplier.state_province,
    createdSupplier.state_province,
  );
  TestValidator.equals(
    "country unchanged",
    updatedSupplier.country,
    createdSupplier.country,
  );
  TestValidator.equals(
    "postal_code unchanged",
    updatedSupplier.postal_code,
    createdSupplier.postal_code,
  );
  TestValidator.equals(
    "website unchanged",
    updatedSupplier.website,
    createdSupplier.website,
  );
  TestValidator.equals(
    "approval_status unchanged",
    updatedSupplier.approval_status,
    createdSupplier.approval_status,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedSupplier.created_at,
    createdSupplier.created_at,
  );
  TestValidator.predicate(
    "updated_at is newer",
    () =>
      new Date(updatedSupplier.updated_at) >
      new Date(createdSupplier.updated_at),
  );
  TestValidator.equals(
    "is_active unchanged",
    updatedSupplier.is_active,
    createdSupplier.is_active,
  );
  // Validate that fields not updated remain the same
  // Note: The API returns the complete updated object, so we don't need to re-fetch
}