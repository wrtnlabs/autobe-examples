import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostReport";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicForumPostReportCollector {
  export async function collect(props: {
    body: IEconomicForumPostReport.ICreate;
    economicForumUsers: IEntity;
    economicForumUserSessions: IEntity;
    economicForumPosts: IEntity;
  }) {
    return {
      id: v4(),
      reason: "report",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: {
        connect: { id: props.economicForumUsers.id },
      },
      reportedPost: {
        connect: { id: props.economicForumPosts.id },
      },
    } satisfies Prisma.economic_forum_post_reportsCreateInput;
  }
}
