import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformReportAtSummaryTransformer {
  export type Payload = Prisma.community_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport.ISummary> {
    const createdAt = input.created_at.toISOString();
    const updatedAt = input.updated_at.toISOString();
    const deletedAt = input.deleted_at?.toISOString() ?? null;
    const reporter =
      await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      );
    const community =
      await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      );
    const base: Omit<ICommunityPlatformReport.ISummary, "target"> = {
      id: input.id,
      reporter,
      community,
      reason: input.reason,
      createdAt,
      updatedAt,
      deletedAt,
    };
    const self: ICommunityPlatformReport.ISummary = {
      ...base,
      target: {
        id: input.target_id,
        target_type: input.target_type,
        target_id: input.target_id,
        created_at: createdAt,
        updated_at: updatedAt,
        deleted_at: deletedAt,
        report: base as unknown as ICommunityPlatformReport.ISummary,
      },
    };
    self.target.report = self;
    return self;
  }
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        snapshots: true,
        targets: true,
        resolution: true,
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
}
