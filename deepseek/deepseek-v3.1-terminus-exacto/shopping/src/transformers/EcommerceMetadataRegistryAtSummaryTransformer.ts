import { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMetadataRegistryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_metadata_registriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        schema_name: true,
        schema_version: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_metadata_registriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMetadataRegistry.ISummary> {
    return {
      id: input.id,
      schema_name: input.schema_name,
      schema_version: input.schema_version,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
