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
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      target_type: props.body.target_type,
      reason: props.body.reason,
      status: "pending",
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: props.body.community_id } },
      resolvedBy: undefined,
      postTarget:
        props.body.target_type === "post"
          ? {
              create: {
                id: v4(),
                post_id: props.body.target_id,
                created_at: new Date(),
              },
            }
          : undefined,
      reportComment:
        props.body.target_type === "comment"
          ? {
              create: {
                id: v4(),
                comment_id: props.body.target_id,
                created_at: new Date(),
              },
            }
          : undefined,
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}
