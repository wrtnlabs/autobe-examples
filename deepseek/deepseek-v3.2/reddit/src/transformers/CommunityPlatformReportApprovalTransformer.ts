import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformContentReportAtSummaryTransformer } from "./CommunityPlatformContentReportAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformReportApprovalTransformer {
  export type Payload = Prisma.community_platform_report_approvalsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        contentReport:
          CommunityPlatformContentReportAtSummaryTransformer.select(),
        moderator: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_report_approvalsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportApproval> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      contentReport:
        await CommunityPlatformContentReportAtSummaryTransformer.transform(
          input.contentReport,
        ),
      moderator: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
