import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportDismissalCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportDismissal.ICreate;
    contentReport: IEntity;
    moderationRole: IEntity;
    communityPlatformAdminSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      contentReport: { connect: { id: props.contentReport.id } },
      moderationRole: { connect: { id: props.moderationRole.id } },
    } satisfies Prisma.community_platform_report_dismissalsCreateInput;
  }
}
