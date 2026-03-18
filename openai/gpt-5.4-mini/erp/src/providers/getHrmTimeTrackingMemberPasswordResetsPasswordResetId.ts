import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingMemberPasswordResetTransformer } from "../transformers/HrmTimeTrackingMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberPasswordResetsPasswordResetId(props: {
  member: MemberPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingMemberPasswordReset> {
  const passwordReset =
    await MyGlobal.prisma.hrm_time_tracking_member_password_resets.findUniqueOrThrow(
      {
        where: {
          id: props.passwordResetId,
        },
        ...HrmTimeTrackingMemberPasswordResetTransformer.select(),
      },
    );
  if (passwordReset.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (passwordReset.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmTimeTrackingMemberPasswordResetTransformer.transform(
    passwordReset,
  );
}
