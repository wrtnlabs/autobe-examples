import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationParameterTransformer } from "../transformers/EcommerceCacheConfigurationParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSuperAdministratorCacheConfigurationsConfigIdParametersParameterId(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationParameter.IUpdate;
}): Promise<IEcommerceCacheConfigurationParameter> {
  // Update the parameter value if provided, using the unique constraint directly
  const updateData: Prisma.ecommerce_cache_configuration_parametersUpdateInput =
    {
      updated_at: new Date(),
    };
  if (props.body.parameterValue !== undefined) {
    updateData.parameter_value = props.body.parameterValue;
  }
  const updatedParameter =
    await MyGlobal.prisma.ecommerce_cache_configuration_parameters.update({
      where: {
        ecommerce_cache_configuration_id_ecommerce_cache_configuration_parameter_definition_id:
          {
            ecommerce_cache_configuration_id: props.configId,
            ecommerce_cache_configuration_parameter_definition_id:
              props.parameterId,
          },
        deleted_at: null,
      },
      data: updateData,
      ...EcommerceCacheConfigurationParameterTransformer.select(),
    });
  return await EcommerceCacheConfigurationParameterTransformer.transform(
    updatedParameter,
  );
}
