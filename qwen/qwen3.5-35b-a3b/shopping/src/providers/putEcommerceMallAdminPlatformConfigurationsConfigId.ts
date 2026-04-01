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
  await MyGlobal.prisma.ecommerce_mall_platform_configurations.findUniqueOrThrow(
    {
      where: { id: props.configId },
    },
  );
  await MyGlobal.prisma.ecommerce_mall_platform_configurations.update({
    where: { id: props.configId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.configuration_type !== undefined && {
        configuration_type: props.body.configuration_type,
      }),
      ...(props.body.scope !== undefined && { scope: props.body.scope }),
      ...(props.body.default_value !== undefined && {
        default_value: props.body.default_value,
      }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      updated_at: new Date(),
    },
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
