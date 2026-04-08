import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikeReportOfCommentTransformer } from "./RedditLikeReportOfCommentTransformer";
import { RedditLikeReportOfPostTransformer } from "./RedditLikeReportOfPostTransformer";

export namespace RedditLikeReportTransformer {
  export type Payload = Prisma.reddit_like_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        redditLikeMember: RedditLikeMemberAtSummaryTransformer.select(),
        postTarget: RedditLikeReportOfPostTransformer.select(),
        commentTarget: RedditLikeReportOfCommentTransformer.select(),
      },
    } satisfies Prisma.reddit_like_reportsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeReport> {
    return {
      id: input.id,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.redditLikeMember,
      ),
      actor_type: input.actor_type,
      reason: input.reason,
      status: input.status,
      postTarget: input.postTarget
        ? await RedditLikeReportOfPostTransformer.transform(input.postTarget)
        : (null as any),
      commentTarget: input.commentTarget
        ? await RedditLikeReportOfCommentTransformer.transform(
            input.commentTarget,
          )
        : (null as any),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditLikeReport;
  }
}
