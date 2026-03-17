import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommentAtSummaryTransformer } from "./CommunityCommentAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityReportAtSummaryTransformer {
  export type Payload = Prisma.community_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        reporter: CommunityMemberAtSummaryTransformer.select(),
        post: CommunityPostAtSummaryTransformer.select(),
        comment: CommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityReport.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      reporter: await CommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      targetType: input.post !== null ? "post" : "comment",
      post: input.post
        ? await CommunityPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await CommunityCommentAtSummaryTransformer.transform(input.comment)
        : null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
