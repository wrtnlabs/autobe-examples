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

export async function postErpHrmTimeTrackingMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimesheet.ICreate;
}): Promise<IErpHrmTimeTrackingTimesheet> {
  if (!props?.member) {
    throw new HttpException("member is required", 400);
  }
  if (!props?.body) {
    throw new HttpException("body is required", 400);
  }
  throw new HttpException("Not implemented", 501);
}
