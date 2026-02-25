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

export async function deleteEcommerceAdministratorCacheConfigurationsConfigIdParametersParameterId(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction to ensure atomicity of validation and deletion
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // First, verify the cache configuration exists
    const config =
      await prisma.ecommerce_cache_configurations.findUniqueOrThrow({
        where: {
          id: props.configId,
          deleted_at: null, // Only check active configurations
        },
        select: { id: true }, // Minimal select for performance
      });
    // Verify the parameter exists and belongs to the specified configuration
    const parameter =
      await prisma.ecommerce_cache_configuration_parameters.findUniqueOrThrow({
        where: {
          id: props.parameterId,
          ecommerce_cache_configuration_id: props.configId,
          deleted_at: null, // Only check active parameters
        },
        select: { id: true, ecommerce_cache_configuration_id: true }, // Verify ownership
      });
    // Ensure the parameter belongs to the correct configuration (redundant but safe)
    if (parameter.ecommerce_cache_configuration_id !== props.configId) {
      throw new HttpException(
        "Parameter not found in specified configuration",
        404,
      );
    }
    // Perform soft deletion with updated timestamp
    await prisma.ecommerce_cache_configuration_parameters.update({
      where: {
        id: props.parameterId,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
