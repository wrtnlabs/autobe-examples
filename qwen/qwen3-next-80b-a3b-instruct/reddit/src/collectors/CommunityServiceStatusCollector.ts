import { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityServiceStatusCollector {
  export async function collect(props: {
    body: ICommunityServiceStatus.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      service_name: "unknown-service",
      status: "unknown",
      last_checked: new Date(),
      description: "Service status automatically monitored",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_service_statusesCreateInput;
  }
}
