import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallPlatformConfigurationTransformer } from "../transformers/EcommerceMallPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminPlatformConfigurationsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceMallPlatformConfiguration.IUpdate;
}): Promise<IEcommerceMallPlatformConfiguration> {
  const configuration =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId, deleted_at: null },
        ...EcommerceMallPlatformConfigurationTransformer.select(),
      },
    );
  const updateData: Record<string, unknown> = {};
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.configuration_type !== undefined) {
    updateData.configuration_type = props.body.configuration_type;
  }
  if (props.body.scope !== undefined) {
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
  const updated =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
        ...EcommerceMallPlatformConfigurationTransformer.select(),
      },
    );
  return await EcommerceMallPlatformConfigurationTransformer.transform(updated);
}
