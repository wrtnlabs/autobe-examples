import { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityReportResolutionCollector {
  export async function collect(props: {
    body: ICommunityReportResolution.ICreate;
    report: IEntity;
    moderator: IEntity;
  }) {
    return {
      id: v4(),
      action: props.body.action,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      report: { connect: { id: props.report.id } },
      moderator: { connect: { id: props.moderator.id } },
    } satisfies Prisma.community_report_resolutionsCreateInput;
  }
}
