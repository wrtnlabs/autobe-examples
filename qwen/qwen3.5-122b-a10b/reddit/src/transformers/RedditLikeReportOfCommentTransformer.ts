import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentAtSummaryTransformer } from "./RedditLikeCommentAtSummaryTransformer";
import { RedditLikeReportAtSummaryTransformer } from "./RedditLikeReportAtSummaryTransformer";

export namespace RedditLikeReportOfCommentTransformer {
  export type Payload = Prisma.reddit_like_report_of_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: RedditLikeReportAtSummaryTransformer.select(),
        comment: RedditLikeCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_report_of_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeReportOfComment> {
    return {
      id: input.id,
      report: await RedditLikeReportAtSummaryTransformer.transform(
        input.report,
      ),
      comment: await RedditLikeCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditLikeReportOfComment;
  }
}
