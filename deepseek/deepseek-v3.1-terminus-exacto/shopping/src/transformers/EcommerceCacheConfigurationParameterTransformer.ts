import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCacheConfigurationParameterTransformer {
  export type Payload =
    Prisma.ecommerce_cache_configuration_parametersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        parameter_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cacheConfiguration: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_cache_configurationsFindManyArgs,
        parameterDefinition: {
          select: {
            parameter_name: true,
            data_type: true,
            description: true,
          },
        } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_cache_configuration_parametersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCacheConfigurationParameter> {
    return {
      id: input.id,
      parameter_name: input.parameterDefinition.parameter_name,
      parameter_value: input.parameter_value,
      data_type: input.parameterDefinition.data_type,
      description: input.parameterDefinition.description,
      created_at: input.created_at.toISOString(),
    };
  }
}
