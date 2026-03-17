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
    communityCommunities: IEntity; // from path parameter communityId
    communityMembers: IEntity; // from authorized actor
    communityMemberSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations (required)
      reporter: { connect: { id: props.communityMembers.id } },
      community: { connect: { id: props.communityCommunities.id } },
      // Optional BelongsTo relations (nullable FKs)
      post: props.body.post_id
        ? { connect: { id: props.body.post_id } }
        : undefined,
      comment: props.body.comment_id
        ? { connect: { id: props.body.comment_id } }
        : undefined,
      // resolver is undefined on creation (report starts as pending)
      resolver: undefined,
    } satisfies Prisma.community_reportsCreateInput;
  }
}
