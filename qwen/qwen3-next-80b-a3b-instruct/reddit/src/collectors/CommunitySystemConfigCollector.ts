import { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunitySystemConfigCollector {
  export async function collect(props: {
    body: ICommunitySystemConfig.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      name: "", // Required field not in DTO. System must provide actual value. Empty placeholder for type safety.
      value: null,
      type: "", // Required field not in DTO. System must provide actual value. Empty placeholder for type safety.
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.community_system_configsCreateInput;
  }
}
