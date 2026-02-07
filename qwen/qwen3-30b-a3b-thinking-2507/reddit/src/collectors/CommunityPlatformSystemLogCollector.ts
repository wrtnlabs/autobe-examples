import { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSystemLogCollector {
  export async function collect(props: {
    body: ICommunityPlatformSystemLog.ICreate;
  }) {
    const id = v4();
    return {
      id,
      level: "INFO",
      message: "No message provided",
      context: null,
      data: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_system_logsCreateInput;
  }
}
