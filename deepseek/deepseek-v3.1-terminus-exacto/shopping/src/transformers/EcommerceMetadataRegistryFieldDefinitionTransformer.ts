import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMetadataRegistryFieldDefinitionTransformer {
  export type Payload =
    Prisma.ecommerce_metadata_registry_field_definitionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        field_name: true,
        field_type: true,
        description: true,
        is_required: true,
        default_value: true,
        validation_rules: true,
        created_at: true,
        updated_at: true,
        metadataRegistry: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_metadata_registriesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_metadata_registry_field_definitionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMetadataRegistryFieldDefinition> {
    return {
      id: input.id,
      field_name: input.field_name,
      field_type: input.field_type,
      description: input.description ?? undefined,
      is_required: input.is_required,
      default_value: input.default_value ?? undefined,
      validation_rules: input.validation_rules ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      ecommerce_metadata_registry_id: input.metadataRegistry.id,
    };
  }
}
