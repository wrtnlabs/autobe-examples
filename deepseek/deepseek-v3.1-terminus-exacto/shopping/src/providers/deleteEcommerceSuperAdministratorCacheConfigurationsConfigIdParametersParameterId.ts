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

export async function deleteEcommerceSuperAdministratorCacheConfigurationsConfigIdParametersParameterId(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify cache configuration exists using findUniqueOrThrow
  await MyGlobal.prisma.ecommerce_cache_configurations.findUniqueOrThrow({
    where: {
      id: props.configId,
      deleted_at: null, // Active config only
    },
  });
  // 2. Check parameter exists and belongs to this configuration
  // Using findUniqueOrThrow for automatic 404 on not found
  const currentTime = new Date();
  const currentTimeString = currentTime.toISOString();
  const parameter =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.findUniqueOrThrow(
      {
        where: {
          id: props.parameterId,
        },
      },
    );
  // Verify parameter belongs to specified cache configuration
  if (parameter.ecommerce_cache_configuration_id !== props.configId) {
    throw new HttpException(
      "Parameter does not belong to specified configuration",
      400,
    );
  }
  // Verify parameter is not already deleted
  if (parameter.deleted_at !== null) {
    throw new HttpException("Parameter already deleted", 400);
  }
  // 3. Perform soft deletion
  await MyGlobal.prisma.ecommerce_cache_configuration_parameters.update({
    where: { id: props.parameterId },
    data: {
      deleted_at: currentTimeString,
      updated_at: currentTimeString,
    },
  });
}
