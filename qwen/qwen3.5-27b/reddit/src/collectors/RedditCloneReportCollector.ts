import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneReportCollector {
  export async function collect(props: {
    body: IRedditCloneReport.ICreate;
    redditCloneMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      report_type: props.body.report_type,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: { connect: { id: props.redditCloneMembers.id } },
      reportedPost: props.body.post_id
        ? { connect: { id: props.body.post_id } }
        : undefined,
      reportedComment: props.body.comment_id
        ? { connect: { id: props.body.comment_id } }
        : undefined,
    } satisfies Prisma.reddit_clone_reportsCreateInput;
  }
}
