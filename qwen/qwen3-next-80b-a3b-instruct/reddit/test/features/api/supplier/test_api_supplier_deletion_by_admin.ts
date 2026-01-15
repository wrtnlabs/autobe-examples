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
export async function test_api_supplier_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create supplier record to be deleted (using admin connection)
  const supplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: RandomGenerator.pick([
            "manufacturer",
            "distributor",
            "wholesaler",
            "retailer",
            "logistics",
          ] as const),
          address_line_1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 7,
          }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          postal_code: typia.random<
            string & tags.Pattern<"^[0-9]{5}(-[0-9]{4})?$">
          >(),
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30",
          credit_limit: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          delivery_capabilities: ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            () =>
              RandomGenerator.pick([
                "standard",
                "express",
                "overnight",
                "cold-chain",
                "hazardous-materials",
                "large-volume",
                "international",
                "local",
              ] as const),
          ),
          compliance_certifications: ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            () =>
              RandomGenerator.pick([
                "iso9001",
                "iso14001",
                "iso45001",
                "fda",
                "haccp",
                "gmp",
                "bcorp",
                "fsc",
                "fair-trade",
                "other",
              ] as const),
          ),
          account_manager_name: RandomGenerator.name(2),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: RandomGenerator.alphaNumeric(30),
          password: "SecurePass123!",
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 3: Delete the supplier record using admin connection
  await api.functional.communityPlatform.inventory_suppliers.erase(
    adminConnection,
    { supplierId: supplier.id },
  );
  // Step 4: Validate that deletion was successful (no response body expected for DELETE)
  // The operation returns void, so we rely on the API returning 204 No Content
  // No need for typia.assert() as the return type is void
  // TestValidator will verify the operation completed successfully
  // No additional assertions needed for deletion - successful completion without error is the validation
}