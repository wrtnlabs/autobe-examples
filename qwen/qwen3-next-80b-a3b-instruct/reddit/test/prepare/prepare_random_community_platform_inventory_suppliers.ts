import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
export function prepare_random_community_platform_inventory_suppliers(
  input?: DeepPartial<ICommunityPlatformInventorySuppliers.ICreate>,
): ICommunityPlatformInventorySuppliers.ICreate {
  return {
    // Test-customizable fields (business data)
    name: input?.name ?? RandomGenerator.name(),
    contact_email:
      input?.contact_email ?? typia.random<string & tags.Format<"email">>(),
    contact_phone:
      input?.contact_phone ??
      typia.random<string & tags.Pattern<"^\\+?[1-9]\\d{1,14}$">>(),
    supplier_type:
      input?.supplier_type ??
      RandomGenerator.pick([
        "manufacturer",
        "distributor",
        "wholesaler",
        "retailer",
        "logistics",
      ] as const),
    address_line_1:
      input?.address_line_1 ?? RandomGenerator.paragraph({ sentences: 1 }),
    address_line_2:
      input?.address_line_2 ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.paragraph({ sentences: 1 })
        : undefined),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? RandomGenerator.name(1),
    country:
      input?.country ??
      RandomGenerator.pick([
        "US",
        "CA",
        "JP",
        "DE",
        "GB",
        "AU",
        "FR",
        "CN",
        "IN",
        "BR",
      ] as const),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(5),
    website: input?.website ?? typia.random<string & tags.Format<"uri">>(),
    payment_terms:
      input?.payment_terms ??
      RandomGenerator.pick([
        "Net 30",
        "Net 60",
        "Net 90",
        "Cash on Delivery",
        "Advance Payment",
        "2/10 Net 30",
      ] as const),
    credit_limit:
      input?.credit_limit ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000000>
      >(),
    delivery_capabilities: input?.delivery_capabilities
      ? input.delivery_capabilities.map((cap) => cap)
      : ArrayUtil.repeat(RandomGenerator.pick([2, 3, 4] as const), () =>
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
    compliance_certifications: input?.compliance_certifications
      ? input.compliance_certifications.map((cert) => cert)
      : ArrayUtil.repeat(RandomGenerator.pick([1, 2, 3, 4] as const), () =>
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
    account_manager_name: input?.account_manager_name ?? RandomGenerator.name(),
    account_manager_email:
      input?.account_manager_email ??
      typia.random<string & tags.Format<"email">>(),
    account_manager_phone:
      input?.account_manager_phone ??
      typia.random<string & tags.Pattern<"^\\+?[1-9]\\d{1,14}$">>(),
    bank_account_details:
      input?.bank_account_details ??
      "Account: " +
        RandomGenerator.alphaNumeric(10) +
        ",Routing: " +
        RandomGenerator.alphaNumeric(9) +
        ",Bank: " +
        RandomGenerator.name(1),
    notes:
      input?.notes ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          })
        : undefined),
    // Security/authentication fields
    password: input?.password ?? RandomGenerator.alphaNumeric(12),
    ip:
      input?.ip ??
      RandomGenerator.pick([
        typia.random<string & tags.Format<"ipv4">>(),
        undefined,
      ] as const),
    href:
      input?.href ??
      "https://" + RandomGenerator.name(1) + ".example.com/admin/suppliers/new",
    referrer:
      input?.referrer ?? "https://" + RandomGenerator.name(1) + ".example.com/",
  };
}