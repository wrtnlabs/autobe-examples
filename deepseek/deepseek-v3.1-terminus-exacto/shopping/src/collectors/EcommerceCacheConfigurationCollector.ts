import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceCacheConfigurationCollector {
  export async function collect(props: {
    body: IEcommerceCacheConfiguration.ICreate;
  }) {
    return {
      id: v4(),
      cache_key: props.body.cache_key,
      cache_type: props.body.cache_type,
      configuration_value: props.body.configuration_value,
      description: props.body.description ?? null,
      is_active: props.body.is_active,
      priority: props.body.priority,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_cache_configurationsCreateInput;
  }
}
