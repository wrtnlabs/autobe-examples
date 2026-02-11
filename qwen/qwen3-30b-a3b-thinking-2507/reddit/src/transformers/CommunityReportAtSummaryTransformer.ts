import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

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
        updated_at: true,
        deleted_at: true,
        post: true,
        comment: true,
        reporter: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityReport.ISummary> {
    return {
      id: input.id,
      reason: input.reason.slice(0, 30),
      status: input.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(input.created_at),
      reporter: await CommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
    };
  }
}
