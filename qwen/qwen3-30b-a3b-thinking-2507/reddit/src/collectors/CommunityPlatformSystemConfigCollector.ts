import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSystemConfigCollector {
  export async function collect(props: {
    body: ICommunityPlatformSystemConfig.ICreate;
  }) {
    const id = v4();
    return {
      id,
      key: props.body.key,
      value: props.body.value,
      description: props.body.description,
      type: props.body.type,
      default_value: null,
      is_active: props.body.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_system_configsCreateInput;
  }
}
