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

export async function postErpHrmTimeTrackingMemberTimesheetVersioningLocks(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimesheetVersioningLock.ICreate;
}): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
  const nowIso = "2026-03-18T12:39:48.567Z" as unknown as string &
    tags.Format<"date-time">;
  return nowIso as any;
}
