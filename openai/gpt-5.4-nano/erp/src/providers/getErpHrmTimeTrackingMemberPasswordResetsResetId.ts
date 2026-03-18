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
import { ErpHrmTimeTrackingMemberPasswordResetTransformer } from "../transformers/ErpHrmTimeTrackingMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingMemberPasswordReset> {
  const reset =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_password_resets.findFirstOrThrow(
      {
        where: {
          id: props.resetId,
          member_id: props.member.id,
        },
        ...ErpHrmTimeTrackingMemberPasswordResetTransformer.select(),
      },
    );
  if (reset.deleted_at !== null) {
    throw new HttpException(
      "Invalid or already used password reset request",
      400,
    );
  }
  const nowValue = new Date().toISOString();
  const nowIso: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(nowValue);
  const expiredAtIso = reset.expired_at.toISOString();
  if (expiredAtIso < nowIso) {
    throw new HttpException("Password reset request has expired", 400);
  }
  return await ErpHrmTimeTrackingMemberPasswordResetTransformer.transform(
    reset,
  );
}
