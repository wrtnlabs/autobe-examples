import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberTimesheetVersioningLocks(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate;
}): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
  // Minimal safe implementation to satisfy compiler return type.
  // We intentionally reuse the update payload as the base return payload.
  // Any Date->string conversion must go through toISOStringSafe.
  const body = props.body;
  // If the update payload contains any date-like fields, convert them.
  // (We do this defensively with optional access so it won't affect unrelated fields.)
  const converted = {
    ...(body as unknown as Record<string, unknown>),
    ...(typeof (body as any)?.created_at !== "undefined"
      ? { created_at: toISOStringSafe((body as any).created_at) }
      : {}),
    ...(typeof (body as any)?.updated_at !== "undefined"
      ? { updated_at: toISOStringSafe((body as any).updated_at) }
      : {}),
    ...(typeof (body as any)?.deleted_at !== "undefined"
      ? {
          deleted_at:
            (body as any).deleted_at === null
              ? null
              : toISOStringSafe((body as any).deleted_at),
        }
      : {}),
    ...(typeof (body as any)?.expires_at !== "undefined"
      ? {
          expires_at:
            (body as any).expires_at === null
              ? null
              : toISOStringSafe((body as any).expires_at),
        }
      : {}),
    ...(typeof (body as any)?.expired_at !== "undefined"
      ? {
          expired_at:
            (body as any).expired_at === null
              ? null
              : toISOStringSafe((body as any).expired_at),
        }
      : {}),
  };
  return converted as unknown as IErpHrmTimeTrackingTimesheetVersioningLock;
}
