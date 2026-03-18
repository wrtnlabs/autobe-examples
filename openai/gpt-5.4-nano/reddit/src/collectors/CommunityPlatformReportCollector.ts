import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformReport.ICreate;
    communityPlatformMembers: IEntity;
  }) {
    const now: Date = new Date();
    return {
      id: v4(),
      target_type: props.body.targetType,
      target_id: props.body.targetId,
      reason: props.body.reason,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      reporter: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: props.body.communityId } },
      snapshots: undefined,
      targets: undefined,
      resolution: undefined,
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}
