import { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportTargetCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportTarget.ICreate;
    report: IEntity; // from path parameter {reportId}
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      report: {
        connect: { id: props.report.id },
      },
    } satisfies Prisma.community_platform_report_targetsCreateInput;
  }
}
