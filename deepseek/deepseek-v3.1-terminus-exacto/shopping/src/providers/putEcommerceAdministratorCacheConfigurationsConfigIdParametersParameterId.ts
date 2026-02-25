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

export async function putEcommerceAdministratorCacheConfigurationsConfigIdParametersParameterId(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameter.IUpdate;
}): Promise<IEcommerceCacheConfigurationParameter> {
  // Verify the parameter exists and belongs to the specified configuration using composite unique constraint
  const existing =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.findUnique({
      where: {
        ecommerce_cache_configuration_id_ecommerce_cache_configuration_parameter_definition_id:
          {
            ecommerce_cache_configuration_id: props.configId,
            ecommerce_cache_configuration_parameter_definition_id:
              props.parameterId,
          },
      },
    });
  if (!existing) {
    throw new HttpException("Cache configuration parameter not found", 404);
  }
  // Update the parameter value and timestamp
  const updatedTimestamp = new Date().toISOString();
  const updated =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(props.body.parameterValue !== undefined && {
          parameter_value: props.body.parameterValue,
        }),
        updated_at: updatedTimestamp,
      },
      ...EcommerceCacheConfigurationParameterTransformer.select(),
    });
  // Transform and return the updated parameter
  return await EcommerceCacheConfigurationParameterTransformer.transform(
    updated,
  );
}
