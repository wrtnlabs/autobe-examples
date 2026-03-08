import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        reporter: RedditLikeMemberAtSummaryTransformer.select(),
        reportedPost: {
          select: { id: true },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
        reportedComment: {
          select: { id: true },
        } satisfies Prisma.reddit_like_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeReport.ISummary> {
    return {
      id: input.id,
      reporter: await RedditLikeMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      reported_content_type: input.reportedPost ? "post" : "comment",
      reported_content_id: input.reportedPost
        ? input.reportedPost.id
        : input.reportedComment!.id,
      status: input.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
