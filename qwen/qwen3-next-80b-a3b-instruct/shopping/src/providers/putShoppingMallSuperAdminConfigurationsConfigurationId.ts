import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function putShoppingMallSuperAdminConfigurationsConfigurationId(props: {
  superAdmin: SuperadminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IShoppingMallConfiguration.IUpdate;
}): Promise<IShoppingMallConfiguration> {
  // Verify configuration exists
  const currentConfig =
    await MyGlobal.prisma.shopping_mall_configurations.findUnique({
      where: { id: props.configurationId },
    });
  if (!currentConfig) {
    throw new HttpException("Configuration not found", 404);
  }
  // Update only fields that exist in the schema: value and description
  const updated = await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { id: props.configurationId },
    data: {
      value:
        props.body.value !== undefined
          ? typeof props.body.value === "string"
            ? props.body.value
            : String(props.body.value)
          : currentConfig.value,
      description:
        props.body.description !== undefined
          ? props.body.description
          : currentConfig.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return only schema-defined fields
  return {
    id: updated.id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    description: updated.description,
    category: currentConfig.category, // From initial retrieval
    key: currentConfig.key, // From initial retrieval
    value: updated.value,
    enabled: currentConfig.enabled,
  };
}
