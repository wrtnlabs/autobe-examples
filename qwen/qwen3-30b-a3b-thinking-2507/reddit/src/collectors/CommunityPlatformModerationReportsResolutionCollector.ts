import { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModerationReportsResolutionCollector {
  export async function collect(props: {
    body: ICommunityPlatformModerationReportsResolution.ICreate;
    communityPlatformReports: IEntity;
    communityPlatformAdmins: IEntity;
    action: string;
  }) {
    const id = v4();
    return {
      id,
      action: props.action,
      resolution_reason: null,
      resolution_timestamp: new Date().toISOString(),
      report: { connect: { id: props.communityPlatformReports.id } },
      moderator: { connect: { id: props.communityPlatformAdmins.id } },
    } satisfies Prisma.community_platform_moderation_reports_resolutionsCreateInput;
  }
}
