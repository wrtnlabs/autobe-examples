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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminConfigCompareEnvironments(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallPlatformConfigurationComparison.IRequest;
}): Promise<IPageIEcommerceMallPlatformConfigurationComparison.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for configurations
  const configWhere: Prisma.ecommerce_mall_platform_configurationsWhereInput = {
    deleted_at: null,
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
    ...(props.body.configurationKeys !== undefined && {
      configuration_key: { in: props.body.configurationKeys },
    }),
  } satisfies Prisma.ecommerce_mall_platform_configurationsWhereInput;
  // Query configurations
  const configurations =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findMany({
      where: configWhere,
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
        scope: true,
        default_value: true,
      } satisfies Prisma.ecommerce_mall_platform_configurationsSelect,
    });
  // Transform to comparison format
  const data = await ArrayUtil.asyncMap(configurations, async (config) => {
    // Initialize environment values with all requested scopes set to null
    const environmentValues: {
      [key: string]: string | number | boolean | null;
    } = {};
    for (const envScope of props.body.environmentScopes) {
      environmentValues[envScope] = null;
    }
    // Populate values from database - use default_value for the scope
    const configType = config.configuration_type;
    let parsedValue: string | number | boolean | null = null;
    if (config.default_value !== null) {
      parsedValue = config.default_value;
      if (configType === "integer") {
        parsedValue = parseInt(config.default_value, 10);
      } else if (configType === "boolean") {
        parsedValue =
          config.default_value === "true" || config.default_value === "1";
      } else if (configType === "json") {
        try {
          parsedValue = JSON.parse(config.default_value);
        } catch {
          parsedValue = null;
        }
      }
    }
    // Only set the matching scope value if available
    environmentValues[config.scope] = parsedValue;
    return {
      id: config.id,
      key: config.configuration_key,
      description: config.description,
      type: config.configuration_type,
      isActive: config.is_active,
      environmentValues,
      created_at: toISOStringSafe(config.created_at),
      updated_at: toISOStringSafe(config.updated_at),
      deleted_at:
        config.deleted_at !== null ? toISOStringSafe(config.deleted_at) : null,
    } satisfies IEcommerceMallPlatformConfigurationComparison.ISummary;
  });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.count({
      where: configWhere,
    });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallPlatformConfigurationComparison.ISummary;
}
