import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationTransformer } from "../transformers/EcommerceCacheConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSuperAdministratorCacheConfigurationsConfigId(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfiguration.IUpdate;
}): Promise<IEcommerceCacheConfiguration> {
  // Validate configId exists
  const existingConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.findUnique({
      where: { id: props.configId, deleted_at: null },
    });
  if (!existingConfig) {
    throw new HttpException("Cache configuration not found", 404);
  }
  // Validate JSON structure if configuration_value is provided
  if (props.body.configuration_value !== undefined) {
    try {
      const configValueString = JSON.stringify(props.body.configuration_value);
      const parsedConfig = JSON.parse(configValueString);
      if (typeof parsedConfig !== "object" || parsedConfig === null) {
        throw new HttpException(
          "configuration_value must be a valid JSON object",
          400,
        );
      }
    } catch {
      throw new HttpException(
        "Invalid JSON structure in configuration_value",
        400,
      );
    }
  }
  // Validate priority range
  if (
    props.body.priority !== undefined &&
    (props.body.priority < 1 || props.body.priority > 10)
  ) {
    throw new HttpException("Priority must be between 1 and 10", 400);
  }
  // Validate cache_key uniqueness if being modified
  if (
    props.body.cache_key !== undefined &&
    props.body.cache_key !== existingConfig.cache_key
  ) {
    const duplicate =
      await MyGlobal.prisma.ecommerce_cache_configurations.findUnique({
        where: { cache_key: props.body.cache_key, deleted_at: null },
      });
    if (duplicate) {
      throw new HttpException("Cache key already exists", 409);
    }
  }
  // Validate cache_type against supported values
  const supportedCacheTypes = [
    "redis",
    "memory",
    "file",
    "database",
    "distributed",
  ];
  if (
    props.body.cache_type !== undefined &&
    !supportedCacheTypes.includes(props.body.cache_type)
  ) {
    throw new HttpException(
      `Cache type must be one of: ${supportedCacheTypes.join(", ")}`,
      400,
    );
  }
  // Prepare update data with proper date handling
  const currentTimestamp = toISOStringSafe(new Date());
  const updateData: Prisma.ecommerce_cache_configurationsUpdateInput = {
    ...(props.body.cache_key !== undefined && {
      cache_key: props.body.cache_key,
    }),
    ...(props.body.cache_type !== undefined && {
      cache_type: props.body.cache_type,
    }),
    ...(props.body.configuration_value !== undefined && {
      configuration_value: props.body.configuration_value,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    updated_at: currentTimestamp,
  };
  // Update configuration
  const updatedConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.update({
      where: { id: props.configId },
      data: updateData,
      ...EcommerceCacheConfigurationTransformer.select(),
    });
  return await EcommerceCacheConfigurationTransformer.transform(updatedConfig);
}
