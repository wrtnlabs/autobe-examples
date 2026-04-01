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
    redditLikeMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      reporter: { connect: { id: props.redditLikeMembers.id } },
      community: { connect: { id: props.body.communityId } },
      reportOfPost: props.body.postId
        ? {
            create: {
              id: v4(),
              created_at: new Date(),
              updated_at: new Date(),
              post: {
                connect: {
                  id: props.body.postId,
                },
              },
            },
          }
        : undefined,
      commentReport: props.body.commentId
        ? {
            create: {
              id: v4(),
              created_at: new Date(),
              updated_at: new Date(),
              comment: { connect: { id: props.body.commentId } },
            },
          }
        : undefined,
    } satisfies Prisma.reddit_like_reportsCreateInput;
  }
}
