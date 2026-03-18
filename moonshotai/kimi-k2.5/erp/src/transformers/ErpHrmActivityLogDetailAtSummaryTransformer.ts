import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmActivityLogDetailAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_activity_log_detailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
      },
    } satisfies Prisma.erp_hrm_activity_log_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLogDetail.ISummary> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
    };
  }
}
