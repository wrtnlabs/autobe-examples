import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentReport.ICreate;
    reporterUser: IEntity;
  }) {
    const id: string = (await import("uuid")).v4();
    return {
      id,
      status: "pending",
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: { connect: { id: props.body.comment_id } },
      reporterUser: { connect: { id: props.reporterUser.id } },
      reportReason: props.body.report_reason_id
        ? { connect: { id: props.body.report_reason_id } }
        : undefined,
    } satisfies Prisma.community_platform_comment_reportsCreateInput;
  }
}
