import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.erp_hrm_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMemberSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      isActive: input.expired_at.getTime() > Date.now(),
    };
  }
}
