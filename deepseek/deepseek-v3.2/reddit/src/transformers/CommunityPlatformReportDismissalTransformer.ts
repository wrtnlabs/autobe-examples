import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformContentReportAtSummaryTransformer } from "./CommunityPlatformContentReportAtSummaryTransformer";
import { CommunityPlatformModerationRoleAtSummaryTransformer } from "./CommunityPlatformModerationRoleAtSummaryTransformer";

export namespace CommunityPlatformReportDismissalTransformer {
  export type Payload = Prisma.community_platform_report_dismissalsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        notes: true,
        created_at: true,
        updated_at: true,
        contentReport:
          CommunityPlatformContentReportAtSummaryTransformer.select(),
        moderationRole:
          CommunityPlatformModerationRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_report_dismissalsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportDismissal> {
    return {
      id: input.id,
      notes: input.notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      contentReport:
        await CommunityPlatformContentReportAtSummaryTransformer.transform(
          input.contentReport,
        ),
      moderationRole:
        await CommunityPlatformModerationRoleAtSummaryTransformer.transform(
          input.moderationRole,
        ),
    };
  }
}
