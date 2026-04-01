import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallPlatformConfigurationCollector {
  export async function collect(props: {
    body: IEcommerceMallPlatformConfiguration.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      configuration_key: props.body.configuration_key,
      description: props.body.description,
      configuration_type: props.body.configuration_type,
      scope: props.body.scope,
      default_value: props.body.default_value ?? null,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      values:
        [] as Prisma.ecommerce_mall_platform_configuration_valuesCreateNestedManyWithoutConfigurationInput,
    } satisfies Prisma.ecommerce_mall_platform_configurationsCreateInput;
  }
}
