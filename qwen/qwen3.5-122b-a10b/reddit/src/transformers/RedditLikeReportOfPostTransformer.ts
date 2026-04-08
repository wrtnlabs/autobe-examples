import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostTransformer } from "./RedditLikePostTransformer";

export namespace RedditLikeReportOfPostTransformer {
  export type Payload = Prisma.reddit_like_report_of_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: {
          select: {
            reason: true,
            status: true,
            redditLikeMember: RedditLikeMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_like_reportsFindManyArgs,
        post: RedditLikePostTransformer.select(),
      },
    } satisfies Prisma.reddit_like_report_of_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeReportOfPost> {
    return {
      id: input.id,
      reason: input.report.reason,
      status: input.report.status,
      reporter: await RedditLikeMemberAtSummaryTransformer.transform(
        input.report.redditLikeMember,
      ),
      post: await RedditLikePostTransformer.transform(input.post),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditLikeReportOfPost;
  }
}
