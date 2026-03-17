import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformReport.ICreate;
    member: IEntity;
    community: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      detail: props.body.detail ?? null,
      status: "open",
      resolution: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: {
        connect: {
          id: props.member.id,
        },
      },
      community: {
        connect: {
          id: props.community.id,
        },
      },
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}
