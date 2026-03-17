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
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityReportTransformer {
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
        updated_at: true,
        reporter: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
        post: CommunityPostAtSummaryTransformer.select(),
        comment: CommunityCommentAtSummaryTransformer.select(),
        resolver: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_reportsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityReport> {
    return {
      id: input.id,
      reporter: await CommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      post:
        input.post !== null
          ? await CommunityPostAtSummaryTransformer.transform(input.post)
          : null,
      comment:
        input.comment !== null
          ? await CommunityCommentAtSummaryTransformer.transform(input.comment)
          : null,
      resolver:
        input.resolver !== null
          ? await CommunityMemberAtSummaryTransformer.transform(input.resolver)
          : null,
      reason: input.reason,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
