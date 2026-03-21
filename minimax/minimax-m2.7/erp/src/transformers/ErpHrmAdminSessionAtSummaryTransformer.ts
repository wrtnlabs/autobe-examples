import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmAdminAtSummaryTransformer } from "./ErpHrmAdminAtSummaryTransformer";

export namespace ErpHrmAdminSessionAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_admin_sessionsGetPayload<
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
        admin: ErpHrmAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmAdminSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      admin: await ErpHrmAdminAtSummaryTransformer.transform(input.admin),
    };
  }
}
