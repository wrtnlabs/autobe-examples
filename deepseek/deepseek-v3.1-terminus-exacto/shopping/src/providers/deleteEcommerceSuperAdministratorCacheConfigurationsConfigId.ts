import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceSuperAdministratorCacheConfigurationsConfigId(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  const currentTimestamp = new Date().toISOString();
  // Verify configuration exists and is not already deleted
  const configuration =
    await MyGlobal.prisma.ecommerce_cache_configurations.findFirst({
      where: {
        id: props.configId,
        deleted_at: null,
      },
    });
  if (!configuration) {
    throw new HttpException(
      "Cache configuration not found or already deleted",
      404,
    );
  }
  // Use transaction to ensure atomicity of deletion and snapshot creation
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot before deletion for audit trail
    await tx.ecommerce_cache_configuration_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_cache_configuration_id: props.configId,
        configuration_state_before: JSON.stringify({
          cache_key: configuration.cache_key,
          cache_type: configuration.cache_type,
          configuration_value: configuration.configuration_value,
          description: configuration.description,
          is_active: configuration.is_active,
          priority: configuration.priority,
          created_at: configuration.created_at.toISOString(),
          updated_at: configuration.updated_at.toISOString(),
        }),
        configuration_state_after: JSON.stringify({
          cache_key: configuration.cache_key,
          cache_type: configuration.cache_type,
          configuration_value: configuration.configuration_value,
          description: configuration.description,
          is_active: configuration.is_active,
          priority: configuration.priority,
          created_at: configuration.created_at.toISOString(),
          updated_at: configuration.updated_at.toISOString(),
          deleted_at: currentTimestamp,
        }),
        change_reason: "Configuration deleted by super administrator",
        changed_by_actor_type: "super_administrator",
        changed_by_actor_id: props.superAdministrator.id,
        created_at: new Date(currentTimestamp),
      },
    });
    // Perform soft delete
    await tx.ecommerce_cache_configurations.update({
      where: { id: props.configId },
      data: {
        deleted_at: new Date(currentTimestamp),
        updated_at: new Date(currentTimestamp),
      },
    });
  });
}
