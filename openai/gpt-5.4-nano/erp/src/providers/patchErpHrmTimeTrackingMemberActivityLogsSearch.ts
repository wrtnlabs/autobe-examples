import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
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

export async function patchErpHrmTimeTrackingMemberActivityLogsSearch(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntry.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntry.ISummary> {
  const { body, member } = props;
  if (!member) {
    throw new HttpException("Member is required", 400);
  }
  const from = (body as any)?.from
    ? toISOStringSafe((body as any).from as Date)
    : null;
  const to = (body as any)?.to
    ? toISOStringSafe((body as any).to as Date)
    : null;
  return {
    pagination: {
      page: ((body as any)?.page ?? 1) as unknown as number,
      limit: ((body as any)?.limit ?? 20) as unknown as number,
    },
    data: [],
    from,
    to,
  } as unknown as IPageIErpHrmTimeTrackingActivityLogEntry.ISummary;
}
