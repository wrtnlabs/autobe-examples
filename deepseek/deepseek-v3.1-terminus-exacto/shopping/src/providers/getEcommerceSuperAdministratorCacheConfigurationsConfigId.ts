import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationTransformer } from "../transformers/EcommerceCacheConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorCacheConfigurationsConfigId(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfiguration> {
  const configuration =
    await MyGlobal.prisma.ecommerce_cache_configurations.findUniqueOrThrow({
      where: { id: props.configId },
      ...EcommerceCacheConfigurationTransformer.select(),
    });
  return await EcommerceCacheConfigurationTransformer.transform(configuration);
}
