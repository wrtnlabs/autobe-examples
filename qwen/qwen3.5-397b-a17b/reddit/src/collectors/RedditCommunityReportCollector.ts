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
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      report_type: props.body.report_type,
      reason: props.body.reason,
      status: "pending",
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      reporter: { connect: { id: props.redditCommunityMembers.id } },
      resolvedBy: undefined,
      // HasOne relations (polymorphic - only one based on report_type)
      reportOfPost:
        props.body.report_type === "post"
          ? {
              create: {
                id: v4(),
                reddit_community_post_id: props.body.target_id,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
      reportOfComment:
        props.body.report_type === "comment"
          ? {
              create: {
                id: v4(),
                reddit_community_comment_id: props.body.target_id,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
    } satisfies Prisma.reddit_community_reportsCreateInput;
  }
}
