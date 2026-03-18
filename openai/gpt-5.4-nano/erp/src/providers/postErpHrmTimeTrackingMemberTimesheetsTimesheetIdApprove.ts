import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
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

export async function postErpHrmTimeTrackingMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTimesheet.IApprove;
}): Promise<IErpHrmTimeTrackingTimesheet> {
  const { member, timesheetId, body } = props;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any =
    (MyGlobal as any).prisma ??
    (MyGlobal as any).db ??
    (MyGlobal as any).client;
  if (!prisma) {
    throw new HttpException("Database client is not available", 500);
  }
  const memberRecord = member as unknown as Record<string, unknown>;
  const memberId = (memberRecord["member_id"] ??
    memberRecord["id"] ??
    memberRecord["memberId"]) as
    | string
    | (string & tags.Format<"uuid">)
    | undefined;
  if (!memberId) {
    throw new HttpException("Member id is not available", 400);
  }
  const timesheet = await prisma.erpHrmTimeTrackingTimesheet.findFirst({
    where: {
      id: timesheetId,
      member_id: memberId,
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  const updatePayload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (v instanceof Date) {
      updatePayload[k] = toISOStringSafe(v);
    } else {
      updatePayload[k] = v;
    }
  }
  const bodyRecord = body as unknown as Record<string, unknown>;
  if ("approved" in bodyRecord) {
    updatePayload["approved"] = bodyRecord["approved"];
  }
  if ("status" in bodyRecord) {
    updatePayload["status"] = bodyRecord["status"];
  }
  const updated = await prisma.erpHrmTimeTrackingTimesheet.update({
    where: { id: timesheetId },
    data: updatePayload,
  });
  return updated as IErpHrmTimeTrackingTimesheet;
}
