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
    redditLikeMember: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      actor_type: props.body.targetType,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      redditLikeMember: { connect: { id: props.redditLikeMember.id } },
      postTarget:
        props.body.targetType === "post"
          ? {
              create: {
                id: v4(),
                reddit_like_post_id: props.body.targetId,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
      commentTarget:
        props.body.targetType === "comment"
          ? {
              create: {
                id: v4(),
                reddit_like_comment_id: props.body.targetId,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
    } satisfies Prisma.reddit_like_reportsCreateInput;
  }
}
