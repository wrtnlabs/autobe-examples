import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCacheConfigurationParameterDefinitionTransformer {
  export type Payload =
    Prisma.ecommerce_cache_configuration_parameter_definitionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        parameter_name: true,
        data_type: true,
        description: true,
        default_value: true,
        validation_rules: true,
        is_required: true,
        min_value: true,
        max_value: true,
        allowed_values: true,
        pattern: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCacheConfigurationParameterDefinition> {
    return {
      id: input.id,
      operation_type: input.parameter_name,
      category_name_before: input.data_type,
      category_description_before: input.description,
      parent_category_id_before: input.default_value ?? null,
      category_name_after: input.validation_rules ?? null,
      category_description_after: input.is_required ? "true" : "false",
      parent_category_id_after: input.min_value ?? null,
      operation_details: input.max_value ?? null,
      created_at: input.created_at.toISOString(),
      administrator: {
        id: "00000000-0000-0000-0000-000000000000",
        email: "placeholder@example.com",
        created_at: new Date().toISOString(),
      },
      category: {
        id: "00000000-0000-0000-0000-000000000000",
        name: "Placeholder Category",
        parent: null,
        products_count: 0,
        created_at: new Date().toISOString(),
      },
    };
  }
}
