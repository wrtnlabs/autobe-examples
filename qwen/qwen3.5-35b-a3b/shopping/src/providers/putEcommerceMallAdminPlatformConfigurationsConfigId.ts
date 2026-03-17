import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallPlatformConfigurationTransformer } from "../transformers/EcommerceMallPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminPlatformConfigurationsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceMallPlatformConfiguration.IUpdate;
}): Promise<IEcommerceMallPlatformConfiguration> {
  const existingConfig =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findFirstOrThrow(
      {
        where: {
          id: props.configId,
          deleted_at: null,
        },
      },
    );
  const updateData: {
    description?: string | undefined;
    configuration_type?: "string" | "integer" | "boolean" | "json" | undefined;
    scope?: "global" | "staging" | "production" | undefined;
    default_value?: string | null | undefined;
    is_active?: boolean | undefined;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.configuration_type !== undefined) {
    const validTypes = ["string", "integer", "boolean", "json"] as const;
    if (!validTypes.includes(props.body.configuration_type)) {
      throw new HttpException("Invalid configuration_type", 400);
    }
    updateData.configuration_type = props.body.configuration_type;
  }
  if (props.body.scope !== undefined) {
    const validScopes = ["global", "staging", "production"] as const;
    if (!validScopes.includes(props.body.scope)) {
      throw new HttpException("Invalid scope", 400);
    }
    updateData.scope = props.body.scope;
  }
  if (props.body.default_value !== undefined) {
    updateData.default_value = props.body.default_value;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  await MyGlobal.prisma.ecommerce_mall_platform_configurations.update({
    where: { id: props.configId },
    data: updateData,
  });
  const updatedConfig =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
        ...EcommerceMallPlatformConfigurationTransformer.select(),
      },
    );
  return await EcommerceMallPlatformConfigurationTransformer.transform(
    updatedConfig,
  );
}
