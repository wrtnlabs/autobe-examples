import { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportResolutionCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportResolution.ICreate;
    report: IEntity;
    moderatedBy: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      resolution_decision: props.body.resolution_decision,
      moderation_note: props.body.moderation_note ?? "",
      resolved_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      report: { connect: { id: props.report.id } },
      moderatedBy: { connect: { id: props.moderatedBy.id } },
      reportSnapshots: undefined,
    } satisfies Prisma.community_platform_report_resolutionsCreateInput;
  }
}
