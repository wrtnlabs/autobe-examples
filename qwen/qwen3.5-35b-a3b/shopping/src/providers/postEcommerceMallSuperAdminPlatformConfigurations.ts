import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallPlatformConfigurationCollector } from "../collectors/EcommerceMallPlatformConfigurationCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallPlatformConfigurationTransformer } from "../transformers/EcommerceMallPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminPlatformConfigurations(props: {
  superAdmin: SuperAdminPayload;
  body: IEcommerceMallPlatformConfiguration.ICreate;
}): Promise<IEcommerceMallPlatformConfiguration> {
  const configKey = props.body.configuration_key;
  const scope = props.body.scope;
  const existing =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findFirst({
      where: {
        configuration_key: configKey,
        scope: scope,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "Configuration key already exists for this scope",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.create({
      data: await EcommerceMallPlatformConfigurationCollector.collect({
        body: props.body,
      }),
      ...EcommerceMallPlatformConfigurationTransformer.select(),
    });
  return await EcommerceMallPlatformConfigurationTransformer.transform(created);
}
