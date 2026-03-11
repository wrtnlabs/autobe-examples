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
    redditLikePosts?: IEntity;
    redditLikeComments?: IEntity;
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
      reportedPost: props.redditLikePosts
        ? { connect: { id: props.redditLikePosts.id } }
        : undefined,
      reportedComment: props.redditLikeComments
        ? { connect: { id: props.redditLikeComments.id } }
        : undefined,
    } satisfies Prisma.reddit_like_reportsCreateInput;
  }
}
