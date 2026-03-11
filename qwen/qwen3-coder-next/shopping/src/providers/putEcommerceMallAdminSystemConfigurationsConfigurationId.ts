import { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSystemConfigurationTransformer } from "../transformers/EcommerceMallSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminSystemConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string;
  body: IEcommerceMallSystemConfiguration.IUpdate;
}): Promise<IEcommerceMallSystemConfiguration> {
  // Check configuration exists
  const existing =
    await MyGlobal.prisma.ecommerce_mall_system_configurations.findUniqueOrThrow(
      {
        where: { id: props.configurationId },
      },
    );
  // Validate key uniqueness (excluding current record)
  const existingKey =
    await MyGlobal.prisma.ecommerce_mall_system_configurations.findUnique({
      where: { key: props.body.key },
    });
  if (existingKey && existingKey.id !== props.configurationId) {
    throw new HttpException("Configuration key already exists", 400);
  }
  // Update the configuration
  const updated =
    await MyGlobal.prisma.ecommerce_mall_system_configurations.update({
      where: { id: props.configurationId },
      data: {
        key: props.body.key,
        value: props.body.value,
        description: props.body.description ?? null,
        updated_at: new Date(),
      },
      ...EcommerceMallSystemConfigurationTransformer.select(),
    });
  return await EcommerceMallSystemConfigurationTransformer.transform(updated);
}
