import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putEcommerceAdministratorCacheConfigurationsConfigId(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfiguration.IUpdate;
}): Promise<IEcommerceCacheConfiguration> {
  // Validate configId exists
  const existingConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.findUniqueOrThrow({
      where: { id: props.configId },
    });
  // Validate cache_key uniqueness if being modified
  if (
    props.body.cache_key !== undefined &&
    props.body.cache_key !== existingConfig.cache_key
  ) {
    const duplicate =
      await MyGlobal.prisma.ecommerce_cache_configurations.findFirst({
        where: {
          cache_key: props.body.cache_key,
          id: { not: props.configId },
          deleted_at: null,
        },
      });
    if (duplicate) {
      throw new HttpException("Cache key already exists", 409);
    }
  }
  // Validate cache_type against supported values
  if (props.body.cache_type !== undefined) {
    const supportedTypes = [
      "redis",
      "memory",
      "file",
      "database",
      "distributed",
    ];
    if (!supportedTypes.includes(props.body.cache_type)) {
      throw new HttpException("Invalid cache type", 400);
    }
  }
  // Validate priority range
  if (
    props.body.priority !== undefined &&
    (props.body.priority < 1 || props.body.priority > 10)
  ) {
    throw new HttpException("Priority must be between 1 and 10", 400);
  }
  // Create snapshot of current configuration
  await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.create({
    data: {
      id: v4(),
      ecommerce_cache_configuration_id: existingConfig.id,
      configuration_state_before: JSON.stringify(existingConfig),
      configuration_state_after: JSON.stringify(existingConfig),
      changed_by_actor_type: "administrator",
      changed_by_actor_id: props.administrator.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Prepare update data
  const updateData: Prisma.ecommerce_cache_configurationsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.cache_key !== undefined) {
    updateData.cache_key = props.body.cache_key;
  }
  if (props.body.cache_type !== undefined) {
    updateData.cache_type = props.body.cache_type;
  }
  if (props.body.configuration_value !== undefined) {
    updateData.configuration_value = JSON.stringify(
      props.body.configuration_value,
    );
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  // Update configuration
  const updatedConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.update({
      where: { id: props.configId },
      data: updateData,
      select: {
        id: true,
        cache_key: true,
        cache_type: true,
        is_active: true,
        priority: true,
        created_at: true,
      },
    });
  return {
    id: updatedConfig.id,
    cache_key: updatedConfig.cache_key,
    cache_type: updatedConfig.cache_type,
    is_active: updatedConfig.is_active,
    priority: updatedConfig.priority,
    created_at: updatedConfig.created_at.toISOString(),
  };
}
