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

export async function getEcommerceMallSuperAdminPlatformConfigurationsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallPlatformConfiguration> {
  const config =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
        ...EcommerceMallPlatformConfigurationTransformer.select(),
      },
    );
  return await EcommerceMallPlatformConfigurationTransformer.transform(config);
}
