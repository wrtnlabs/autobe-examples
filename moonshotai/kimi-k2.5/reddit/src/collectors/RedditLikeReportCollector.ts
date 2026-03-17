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
    const now: Date = new Date();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: now,
      updated_at: now,
      reporter: { connect: { id: props.redditLikeMembers.id } },
      community: { connect: { id: props.body.communityId } },
      reportOfPost: props.body.postId
        ? {
            create: {
              id: v4(),
              post: { connect: { id: props.body.postId } },
              created_at: now,
              updated_at: now,
            },
          }
        : undefined,
      commentReport: props.body.commentId
        ? {
            create: {
              id: v4(),
              comment: { connect: { id: props.body.commentId } },
              created_at: now,
              updated_at: now,
            },
          }
        : undefined,
    } satisfies Prisma.reddit_like_reportsCreateInput;
  }
}
