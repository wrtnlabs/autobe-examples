import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";

export namespace EcommerceMetadataRegistryRelationshipOfVariantConfigTransformer {
  export type Payload =
    Prisma.ecommerce_metadata_registry_relationship_of_variant_configsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        parameter_name: true,
        parameter_value: true,
        data_type: true,
        validation_rules: true,
        default_value: true,
        description: true,
        is_required: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        metadataRegistryRelationship:
          EcommerceAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_metadata_registry_relationship_of_variant_configsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMetadataRegistryRelationshipOfVariantConfig> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      administrator: await EcommerceAdministratorAtSummaryTransformer.transform(
        input.metadataRegistryRelationship,
      ),
    };
  }
}
