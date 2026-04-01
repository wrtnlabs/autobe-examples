import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallPlatformConfigurationTransformer {
  export type Payload = Prisma.ecommerce_mall_platform_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        configuration_key: true,
        description: true,
        configuration_type: true,
        scope: true,
        default_value: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        values: {
          select: {
            id: true,
            configuration: true,
            value: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.ecommerce_mall_platform_configuration_valuesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_platform_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallPlatformConfiguration> {
    return {
      id: input.id,
      configuration_key: input.configuration_key,
      description: input.description,
      configuration_type: input.configuration_type,
      scope: input.scope,
      default_value: input.default_value,
      is_active: input.is_active,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallPlatformConfiguration;
  }
}
