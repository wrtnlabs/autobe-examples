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
    community: IEntity;
    member: IEntity;
  }) {
    return {
      id: v4(),
      target_type: props.body.targetType,
      target_id: props.body.targetId,
      reason: props.body.reason,
      status: "pending",
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.community.id } },
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}
