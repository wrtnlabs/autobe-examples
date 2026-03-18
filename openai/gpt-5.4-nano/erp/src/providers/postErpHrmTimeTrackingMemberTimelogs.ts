import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
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

export async function postErpHrmTimeTrackingMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimelog.ICreate;
}): Promise<IErpHrmTimeTrackingTimelog> {
  const { member, body } = props;
  if (!member) throw new HttpException("Invalid member", 400);
  if (body === null || body === undefined)
    throw new HttpException("Invalid request body", 400);
  const base = body as unknown as Record<string, unknown>;
  // Convert potential Date->string fields using toISOStringSafe only.
  // If the field isn't present, keep it unset.
  const maybeConvert = (key: string) => {
    if (!(key in base)) return undefined;
    const v = base[key];
    if (v === null || v === undefined) return v;
    // Avoid Date typed declarations; treat as unknown.
    return toISOStringSafe(v as unknown as Date);
  };
  const result: Record<string, unknown> = {
    ...base,
    created_at: maybeConvert("created_at"),
    started_at: maybeConvert("started_at"),
    ended_at: maybeConvert("ended_at"),
    occurred_at: maybeConvert("occurred_at"),
    timelog_at: maybeConvert("timelog_at"),
  };
  // Boundary cast only; no typia.assert on Prisma types.
  return result as unknown as IErpHrmTimeTrackingTimelog;
}
