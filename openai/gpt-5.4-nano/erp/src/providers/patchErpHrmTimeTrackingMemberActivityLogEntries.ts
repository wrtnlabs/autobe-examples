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

export async function patchErpHrmTimeTrackingMemberActivityLogEntries(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntry.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntry.ISummary> {
  throw new HttpException("Not implemented", 501);
}
