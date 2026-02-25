import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceCacheConfigurationParameterDefinitionCollector {
  export async function collect(props: {
    body: IEcommerceCacheConfigurationParameterDefinition.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      parameter_name: props.body.parameter_name,
      data_type: props.body.data_type,
      description: props.body.description,
      default_value: props.body.default_value ?? null,
      validation_rules: props.body.validation_rules ?? null,
      is_required: props.body.is_required,
      min_value: props.body.min_value ?? null,
      max_value: props.body.max_value ?? null,
      allowed_values: props.body.allowed_values ?? null,
      pattern: props.body.pattern ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // HasMany relation - not applicable for creation
      parameterValues: undefined,
    } satisfies Prisma.ecommerce_cache_configuration_parameter_definitionsCreateInput;
  }
}
