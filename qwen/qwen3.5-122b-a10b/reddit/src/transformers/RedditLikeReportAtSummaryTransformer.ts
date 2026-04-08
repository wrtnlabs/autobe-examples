import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        actor_type: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        redditLikeMember: RedditLikeMemberAtSummaryTransformer.select(),
        postTarget: { select: { id: true } },
        commentTarget: { select: { id: true } },
      },
    } satisfies Prisma.reddit_like_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeReport.ISummary> {
    return {
      id: input.id,
      reporter: await RedditLikeMemberAtSummaryTransformer.transform(
        input.redditLikeMember,
      ),
      actor_type: typia.assert<"post" | "comment">(input.actor_type),
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "dismissed">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    } satisfies IRedditLikeReport.ISummary;
  }
}
