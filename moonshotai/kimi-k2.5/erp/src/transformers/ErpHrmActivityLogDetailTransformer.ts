import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmActivityLogAtSummaryTransformer } from "./ErpHrmActivityLogAtSummaryTransformer";

export namespace ErpHrmActivityLogDetailTransformer {
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
        activityLog: ErpHrmActivityLogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_activity_log_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLogDetail> {
    return {
      id: input.id,
      activityLog: await ErpHrmActivityLogAtSummaryTransformer.transform(
        input.activityLog,
      ),
      key: input.key,
      value: input.value ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
