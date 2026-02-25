import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostReport.ICreate;
    reportingUser: IEntity;
    reportedPost: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      reportingUser: { connect: { id: props.reportingUser.id } },
      reportedPost: { connect: { id: props.reportedPost.id } },
    } satisfies Prisma.community_platform_post_reportsCreateInput;
  }
}
