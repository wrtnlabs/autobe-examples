import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMetadataRegistryFieldDefinitionAtSummaryTransformer {
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
        is_required: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_metadata_registry_field_definitionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMetadataRegistryFieldDefinition.ISummary> {
    return {
      id: input.id,
      field_name: input.field_name,
      field_type: input.field_type,
      is_required: input.is_required,
      created_at: input.created_at.toISOString(),
    };
  }
}
