import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberPasswordReset";
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

export async function getErpHrmTimeTrackingMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingMemberPasswordReset> {
  const reset =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        select: {
          id: true,
          expired_at: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  if (reset.deleted_at !== null) {
    throw new HttpException("This reset request is invalidated", 400);
  }
  const nowMs = Date.now();
  if (reset.expired_at.getTime() <= nowMs) {
    throw new HttpException("This reset request is expired", 400);
  }
  return {
    id: reset.id,
    expired_at: toISOStringSafe(reset.expired_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      reset.deleted_at === null
        ? null
        : (toISOStringSafe(reset.deleted_at) as string &
            tags.Format<"date-time">),
    created_at: toISOStringSafe(reset.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(reset.updated_at) as string &
      tags.Format<"date-time">,
  };
}
