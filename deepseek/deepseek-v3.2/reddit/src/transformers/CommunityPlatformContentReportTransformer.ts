import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformReportApprovalTransformer } from "./CommunityPlatformReportApprovalTransformer";
import { CommunityPlatformReportDismissalTransformer } from "./CommunityPlatformReportDismissalTransformer";
import { CommunityPlatformReportOfCommentTransformer } from "./CommunityPlatformReportOfCommentTransformer";
import { CommunityPlatformReportOfPostTransformer } from "./CommunityPlatformReportOfPostTransformer";

export namespace CommunityPlatformContentReportTransformer {
  export type Payload = Prisma.community_platform_content_reportsGetPayload<
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
        deleted_at: true,
        reporterMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        postReport: CommunityPlatformReportOfPostTransformer.select(),
        commentReport: CommunityPlatformReportOfCommentTransformer.select(),
        approval: CommunityPlatformReportApprovalTransformer.select(),
        dismissal: CommunityPlatformReportDismissalTransformer.select(),
      },
    } satisfies Prisma.community_platform_content_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformContentReport> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.reporterMember,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      postReport: input.postReport
        ? await CommunityPlatformReportOfPostTransformer.transform(
            input.postReport,
          )
        : undefined,
      commentReport: input.commentReport
        ? await CommunityPlatformReportOfCommentTransformer.transform(
            input.commentReport,
          )
        : undefined,
      approval: input.approval
        ? await CommunityPlatformReportApprovalTransformer.transform(
            input.approval,
          )
        : undefined,
      dismissal: input.dismissal
        ? await CommunityPlatformReportDismissalTransformer.transform(
            input.dismissal,
          )
        : undefined,
    };
  }
}
