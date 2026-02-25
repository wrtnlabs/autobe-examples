import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformConfigurationCollector {
  export async function collect(props: {
    body: ICommunityPlatformConfiguration.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      data_type: props.body.data_type,
      scope: props.body.scope,
      description: props.body.description,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_configurationsCreateInput;
  }
}
