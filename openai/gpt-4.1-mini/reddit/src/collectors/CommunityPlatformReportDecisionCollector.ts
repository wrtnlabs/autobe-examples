import { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportDecisionCollector {
  const { v4 } = require("uuid");
  export async function collect(props: {
    body: ICommunityPlatformReportDecision.ICreate;
    decision: string;
    comments?: string | null;
    report: IEntity;
    moderator: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      decision: props.decision,
      comments: props.comments ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report: { connect: { id: props.report.id } },
      moderator: { connect: { id: props.moderator.id } },
    } satisfies Prisma.community_platform_reports_decisionsCreateInput;
  }
}
