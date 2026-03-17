import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformContentReportAtSummaryTransformer {
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
      },
    } satisfies Prisma.community_platform_content_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformContentReport.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.reporterMember,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
