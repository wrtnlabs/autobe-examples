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
  // Transform the create DTO to Prisma input using the collector
  const createInput = await EcommerceMallPlatformConfigurationCollector.collect(
    {
      body: props.body,
    },
  );
  // Create the platform configuration in the database
  const created =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.create({
      data: createInput,
      ...EcommerceMallPlatformConfigurationTransformer.select(),
    });
  // Transform the database record to the response DTO
  return await EcommerceMallPlatformConfigurationTransformer.transform(created);
}
