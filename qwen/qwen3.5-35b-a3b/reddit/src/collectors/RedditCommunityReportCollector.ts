import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityReportCollector {
  export async function collect(props: {
    body: IRedditCommunityReport.ICreate;
    redditCommunityMembers: IEntity;
    redditCommunityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      reason: props.body.reason.trim(),
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_community_reportsCreateInput;
  }
}
