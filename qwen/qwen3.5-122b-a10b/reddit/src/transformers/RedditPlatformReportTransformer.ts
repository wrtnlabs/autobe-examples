import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformReportTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReport> {
    return {
      id: input.id,
      reporter: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      post: input.post
        ? await RedditPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await RedditPlatformCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : null,
      reviewer: input.reviewer
        ? await RedditPlatformMemberAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: RedditPlatformMemberAtSummaryTransformer.select(),
        post: RedditPlatformPostAtSummaryTransformer.select(),
        comment: RedditPlatformCommentAtSummaryTransformer.select(),
        reviewer: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
}
