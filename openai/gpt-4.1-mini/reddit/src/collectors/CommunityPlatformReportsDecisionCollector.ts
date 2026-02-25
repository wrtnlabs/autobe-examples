import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportsDecisionCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportsDecision.ICreate;
    moderator: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      decision: props.body.status,
      comments: props.body.comment ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report: { connect: { id: props.body.reportId } },
      moderator: { connect: { id: props.moderator.id } },
    } satisfies Prisma.community_platform_reports_decisionsCreateInput;
  }
}
