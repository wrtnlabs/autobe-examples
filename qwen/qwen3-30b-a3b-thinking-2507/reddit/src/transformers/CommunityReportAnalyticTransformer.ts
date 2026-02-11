import { ICommunityReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityReportAnalyticTransformer {
  export type Payload = Prisma.community_reportsGetPayload<
    ReturnType<typeof select>
  >[];
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        status: true,
        post: true,
        comment: true,
        reporter: true,
      },
    } satisfies Prisma.community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityReportAnalytic> {
    const pending = input.filter(
      (item) => item.status === "pending" && !item.deleted_at,
    ).length;
    const approved = input.filter(
      (item) => item.status === "approved" && !item.deleted_at,
    ).length;
    const dismissed = input.filter(
      (item) => item.status === "dismissed" && !item.deleted_at,
    ).length;
    return {
      pending,
      approved,
      dismissed,
    };
  }
}
