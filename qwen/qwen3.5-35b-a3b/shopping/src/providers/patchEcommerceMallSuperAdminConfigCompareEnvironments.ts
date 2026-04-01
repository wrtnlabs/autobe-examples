import { IEcommerceMallPlatformConfigurationComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfigurationComparison";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallPlatformConfigurationComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfigurationComparison";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminConfigCompareEnvironments(props: {
  superAdmin: SuperAdminPayload;
  body: IEcommerceMallPlatformConfigurationComparison.IRequest;
}): Promise<IPageIEcommerceMallPlatformConfigurationComparison.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Build where clause for configurations
  const whereInput: Prisma.ecommerce_mall_platform_configurationsWhereInput = {
    deleted_at: null,
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.configurationKeys && props.body.configurationKeys.length > 0
      ? { configuration_key: { in: props.body.configurationKeys } }
      : {}),
  } satisfies Prisma.ecommerce_mall_platform_configurationsWhereInput;
  // Get total count for pagination
  const total: number & tags.Type<"int32"> & tags.Minimum<0> =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.count({
      where: whereInput,
    });
  // Query configurations with pagination
  const configurations =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        configuration_key: true,
        description: true,
        configuration_type: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Get all configuration values for these configurations filtered by environment scopes
  const configurationIds = configurations.map((config) => config.id);
  const values =
    await MyGlobal.prisma.ecommerce_mall_platform_configuration_values.findMany(
      {
        where: {
          ecommerce_mall_platform_configuration_id: { in: configurationIds },
          deleted_at: null,
          environment_scope: { in: props.body.environmentScopes },
        },
        select: {
          id: true,
          configuration: true,
          key: true,
          value: true,
          environment_scope: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  // Group values by configuration to build environmentValues map
  const environmentValueMap = new Map<
    string,
    Record<string, string | number | boolean | null>
  >();
  for (const config of configurations) {
    environmentValueMap.set(config.id, {});
  }
  for (const value of values) {
    const map = environmentValueMap.get(value.configuration.id);
    if (map) {
      map[value.environment_scope] = value.value;
    }
  }
  // Transform configurations to response format
  const data = await ArrayUtil.asyncMap(configurations, async (config) => {
    const environmentValues: {
      [key: string]: string | number | boolean | null;
    } = environmentValueMap.get(config.id) ?? {};
    return {
      id: config.id,
      key: config.configuration_key,
      description: config.description,
      type: config.configuration_type,
      isActive: config.is_active,
      environmentValues,
      created_at: toISOStringSafe(config.created_at),
      updated_at: toISOStringSafe(config.updated_at),
      deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
    } satisfies IEcommerceMallPlatformConfigurationComparison.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceMallPlatformConfigurationComparison.ISummary;
}
