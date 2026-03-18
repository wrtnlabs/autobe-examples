import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformTimesheetAtRejectTransformer {
  export type Payload = Prisma.hrm_platform_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        rejection_reason: true,
      },
    } satisfies Prisma.hrm_platform_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheet.IReject> {
    return {
      rejection_reason: input.rejection_reason ?? null,
    };
  }
}
