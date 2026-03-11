import { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSystemConfigurationCollector } from "../collectors/EcommerceMallSystemConfigurationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSystemConfigurationTransformer } from "../transformers/EcommerceMallSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IEcommerceMallSystemConfiguration.ICreate;
}): Promise<IEcommerceMallSystemConfiguration> {
  const created =
    await MyGlobal.prisma.ecommerce_mall_system_configurations.create({
      data: await EcommerceMallSystemConfigurationCollector.collect({
        body: props.body,
      }),
      ...EcommerceMallSystemConfigurationTransformer.select(),
    });
  return await EcommerceMallSystemConfigurationTransformer.transform(created);
}
