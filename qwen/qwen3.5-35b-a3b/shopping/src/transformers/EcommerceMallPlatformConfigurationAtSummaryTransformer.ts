import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallPlatformConfigurationAtSummaryTransformer {
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
        values: true,
      },
    } satisfies Prisma.ecommerce_mall_platform_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallPlatformConfiguration.ISummary> {
    return {
      id: input.id,
      configuration_key: input.configuration_key,
      description: input.description,
      configuration_type: input.configuration_type,
      scope: input.scope,
      default_value: input.default_value ?? undefined,
      is_active: input.is_active,
    };
  }
}
