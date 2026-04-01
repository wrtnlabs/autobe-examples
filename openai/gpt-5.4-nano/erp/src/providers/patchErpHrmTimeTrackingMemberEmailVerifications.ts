import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberEmailVerification";
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

export async function patchErpHrmTimeTrackingMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingMemberEmailVerification.IRequest;
}): Promise<IErpHrmTimeTrackingMemberEmailVerification> {
  const token = (props.body.token ?? "") satisfies string;
  const href = (props.body.href ?? "") satisfies string;
  const ip = (props.body.ip ?? "") satisfies string;
  return {
    id: v4(),
    referrer: "" satisfies string,
    deleted_at: null,
    erp_hrm_time_tracking_member_id: props.member.id,
    token,
    href,
    ip,
    created_at: toISOStringSafe(new Date(0)),
    updated_at: toISOStringSafe(new Date(0)),
    expired_at: toISOStringSafe(new Date(0)),
  };
}
