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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceMallAdminSystemConfigurationsConfigurationKey(props: {
  admin: AdminPayload;
  configurationKey: string;
}): Promise<IEcommerceMallSystemConfiguration> {
  const config =
    await MyGlobal.prisma.ecommerce_mall_system_configurations.findUniqueOrThrow(
      {
        where: { key: props.configurationKey, deleted_at: null },
        ...EcommerceMallSystemConfigurationTransformer.select(),
      },
    );
  return await EcommerceMallSystemConfigurationTransformer.transform(config);
}
