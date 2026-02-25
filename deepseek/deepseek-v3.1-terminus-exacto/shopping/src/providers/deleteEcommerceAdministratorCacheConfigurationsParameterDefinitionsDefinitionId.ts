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

export async function deleteEcommerceAdministratorCacheConfigurationsParameterDefinitionsDefinitionId(props: {
  administrator: AdministratorPayload;
  definitionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify administrator exists and is active
  await MyGlobal.prisma.ecommerce_administrators.findUniqueOrThrow({
    where: {
      id: props.administrator.id,
      deleted_at: null,
    },
  });
  // Check if parameter definition exists and is not already deleted
  const definition =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.findUniqueOrThrow(
      {
        where: {
          id: props.definitionId,
          deleted_at: null,
        },
      },
    );
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_cache_configuration_parameter_definitions.update(
    {
      where: { id: props.definitionId },
      data: {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  );
}
