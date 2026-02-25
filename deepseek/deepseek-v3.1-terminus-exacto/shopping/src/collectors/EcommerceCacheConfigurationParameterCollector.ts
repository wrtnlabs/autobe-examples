import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceCacheConfigurationParameterCollector {
  export async function collect(props: {
    body: IEcommerceCacheConfigurationParameter.ICreate;
    ecommerceCacheConfigurations: IEntity;
  }) {
    return {
      id: v4(),
      parameter_value: props.body.parameter_value,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cacheConfiguration: {
        connect: { id: props.ecommerceCacheConfigurations.id },
      },
      parameterDefinition: {
        connect: {
          id: props.body.ecommerce_cache_configuration_parameter_definition_id,
        },
      },
    } satisfies Prisma.ecommerce_cache_configuration_parametersCreateInput;
  }
}
