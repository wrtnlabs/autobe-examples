import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformReport.ICreate;
    communityPlatformMembers: IEntity; // from authorized actor
    communityPlatformMemberSessions: IEntity; // from authorized session
    communityPlatformComments: IEntity; // from path parameter commentId
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: {
        connect: { id: props.communityPlatformMembers.id },
      },
      post: undefined,
      comment: {
        connect: { id: props.communityPlatformComments.id },
      },
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}
