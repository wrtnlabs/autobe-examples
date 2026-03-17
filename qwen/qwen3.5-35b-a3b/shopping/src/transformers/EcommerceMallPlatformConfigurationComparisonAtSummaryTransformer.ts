import { IEcommerceMallPlatformConfigurationComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfigurationComparison";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallPlatformConfigurationComparisonAtSummaryTransformer {
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
            value: true,
          },
        } satisfies Prisma.ecommerce_mall_platform_configuration_valuesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_platform_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallPlatformConfigurationComparison.ISummary> {
    const environmentValues: {
      [key: string]: string | number | boolean | null;
    } = {};
    for (const v of input.values) {
      environmentValues[input.scope] = v.value;
    }
    return {
      id: input.id,
      key: input.configuration_key,
      description: input.description,
      type: input.configuration_type,
      isActive: input.is_active,
      environmentValues,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
