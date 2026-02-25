import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCacheConfigurationParameterTransformer } from "../transformers/EcommerceCacheConfigurationParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorCacheConfigurationsConfigIdParametersParameterId(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfigurationParameter> {
  const parameter =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.findFirstOrThrow(
      {
        where: {
          id: props.parameterId,
          ecommerce_cache_configuration_id: props.configId,
          deleted_at: null,
        },
        ...EcommerceCacheConfigurationParameterTransformer.select(),
      },
    );
  return await EcommerceCacheConfigurationParameterTransformer.transform(
    parameter,
  );
}
