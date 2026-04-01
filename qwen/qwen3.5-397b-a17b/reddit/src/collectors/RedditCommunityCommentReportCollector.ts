import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommentReportCollector {
  export async function collect(props: {
    body: IRedditCommunityCommentReport.ICreate;
    redditCommunityComments: IEntity;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "PENDING",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: { connect: { id: props.redditCommunityComments.id } },
      reporterMember: { connect: { id: props.redditCommunityMembers.id } },
    } satisfies Prisma.reddit_community_comment_reportsCreateInput;
  }
}
