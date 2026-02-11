import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityReportCollector {
  export async function collect(props: {
    body: ICommunityReport.ICreate;
    communityMembers: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: props.body.community_post_id
        ? { connect: { id: props.body.community_post_id } }
        : undefined,
      comment: props.body.community_comment_id
        ? { connect: { id: props.body.community_comment_id } }
        : undefined,
      reporter: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_reportsCreateInput;
  }
}
