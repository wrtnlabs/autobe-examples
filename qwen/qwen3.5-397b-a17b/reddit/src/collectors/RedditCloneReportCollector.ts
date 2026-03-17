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
    reporter: IEntity;
    community: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      // Scalar fields
      id,
      target_type: props.body.target_type,
      reason: props.body.reason,
      review_status: "PENDING",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      reporter: { connect: { id: props.reporter.id } },
      community: { connect: { id: props.community.id } },
      // HasOne relations - subtype records
      // action: Not created here - moderator creates in report_actions
      action: undefined,
      // Create appropriate subtype based on target_type
      reportOfPost:
        props.body.target_type === "POST"
          ? {
              create: {
                id: v4(),
                created_at: now,
                updated_at: now,
                post: { connect: { id: props.body.target_id } },
              },
            }
          : undefined,
      commentReport:
        props.body.target_type === "COMMENT"
          ? {
              create: {
                id: v4(),
                comment: { connect: { id: props.body.target_id } },
              },
            }
          : undefined,
    } satisfies Prisma.reddit_clone_reportsCreateInput;
  }
}
