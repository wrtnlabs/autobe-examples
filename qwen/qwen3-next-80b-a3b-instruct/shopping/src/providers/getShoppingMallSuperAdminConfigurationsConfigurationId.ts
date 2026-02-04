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

export async function getShoppingMallSuperAdminConfigurationsConfigurationId(props: {
  superAdmin: SuperadminPayload;
  configurationId: string;
}): Promise<IShoppingMallConfiguration> {
  const configuration =
    await MyGlobal.prisma.shopping_mall_configurations.findUnique({
      where: { id: props.configurationId },
    });
  if (!configuration || !configuration.value) {
    throw new HttpException("Configuration not found", 404);
  }
  // Parse and validate the JSON string stored in the value field which contains the complete configuration
  const configData: IShoppingMallConfiguration =
    typia.assert<IShoppingMallConfiguration>(JSON.parse(configuration.value));
  // Return with preserved database timestamps
  return {
    ...configData,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
  };
}
