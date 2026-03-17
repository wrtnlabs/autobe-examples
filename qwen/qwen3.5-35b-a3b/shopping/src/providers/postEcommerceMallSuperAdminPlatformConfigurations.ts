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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallPlatformConfigurationTransformer } from "../transformers/EcommerceMallPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminPlatformConfigurations(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallPlatformConfiguration.ICreate;
}): Promise<IEcommerceMallPlatformConfiguration> {
  try {
    const input = await EcommerceMallPlatformConfigurationCollector.collect({
      body: props.body,
    });
    const created =
      await MyGlobal.prisma.ecommerce_mall_platform_configurations.create({
        data: input,
        ...EcommerceMallPlatformConfigurationTransformer.select(),
      });
    return await EcommerceMallPlatformConfigurationTransformer.transform(
      created,
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      throw new HttpException(
        "Configuration with this key already exists in this scope",
        409,
      );
    }
    throw error;
  }
}
