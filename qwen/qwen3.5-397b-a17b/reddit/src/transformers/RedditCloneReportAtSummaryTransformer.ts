import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reporter: RedditCloneMemberAtSummaryTransformer.select(),
        target_type: true,
        reason: true,
        review_status: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_clone_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneReport.ISummary> {
    return {
      id: input.id,
      reporter: await RedditCloneMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      target_type: typia.assert<"POST" | "COMMENT">(input.target_type),
      reason: input.reason,
      review_status: typia.assert<"PENDING" | "APPROVED" | "DISMISSED">(
        input.review_status,
      ),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
