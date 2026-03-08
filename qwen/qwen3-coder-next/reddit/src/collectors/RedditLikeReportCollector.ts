import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeReportCollector {
  export async function collect(props: {
    body: IRedditLikeReport.ICreate;
    redditLikeMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: { connect: { id: props.redditLikeMembers.id } },
      reportedPost: props.body.reported_post_id
        ? { connect: { id: props.body.reported_post_id } }
        : undefined,
      reportedComment: props.body.reported_comment_id
        ? { connect: { id: props.body.reported_comment_id } }
        : undefined,
    } satisfies Prisma.reddit_like_reportsCreateInput;
  }
}
