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

export async function deleteEcommerceSuperAdministratorCacheConfigurationsParameterDefinitionsDefinitionId(props: {
  superAdministrator: SuperadministratorPayload;
  definitionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the parameter definition exists and is not already deleted
  const definition =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findUnique(
      {
        where: { id: props.definitionId },
        select: { id: true, deleted_at: true },
      },
    );
  if (definition === null) {
    throw new HttpException(
      "Cache configuration parameter definition not found",
      404,
    );
  }
  if (definition.deleted_at !== null) {
    throw new HttpException(
      "Cache configuration parameter definition has already been deleted",
      404,
    );
  }
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.update(
    {
      where: { id: props.definitionId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    },
  );
}
