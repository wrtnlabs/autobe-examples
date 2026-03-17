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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallPlatformConfigurationTransformer } from "../transformers/EcommerceMallPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminPlatformConfigurations(props: {
  admin: AdminPayload;
  body: IEcommerceMallPlatformConfiguration.ICreate;
}): Promise<IEcommerceMallPlatformConfiguration> {
  try {
    const created =
      await MyGlobal.prisma.ecommerce_mall_platform_configurations.create({
        data: await EcommerceMallPlatformConfigurationCollector.collect({
          body: props.body,
        }),
        ...EcommerceMallPlatformConfigurationTransformer.select(),
      });
    return await EcommerceMallPlatformConfigurationTransformer.transform(
      created,
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Configuration with this key and scope already exists",
          409,
        );
      }
    }
    throw new HttpException("Database error", 500);
  }
}
