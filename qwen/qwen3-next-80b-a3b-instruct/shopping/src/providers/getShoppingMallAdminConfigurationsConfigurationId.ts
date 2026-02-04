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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string;
}): Promise<IShoppingMallConfiguration> {
  const configuration =
    await MyGlobal.prisma.shopping_mall_configurations.findUnique({
      where: { id: props.configurationId },
    });
  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }
  // Parse the configuration value as JSON since it's stored as a string in the database
  const configValue = JSON.parse(configuration.value);
  return {
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
    currency: configValue.currency,
    timezone: configValue.timezone,
    locale: configValue.locale,
    payment_gateway: configValue.payment_gateway,
    tax_calculation: configValue.tax_calculation,
    shipping_rate_strategy: configValue.shipping_rate_strategy,
    feature_toggles: configValue.feature_toggles,
  };
}
