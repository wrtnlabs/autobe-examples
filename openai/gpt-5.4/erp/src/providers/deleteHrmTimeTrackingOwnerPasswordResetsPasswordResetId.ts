import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingOwnerPasswordResetsPasswordResetId(props: {
  owner: OwnerPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const passwordReset =
    await MyGlobal.prisma.hrm_time_tracking_owner_password_resets.findUniqueOrThrow(
      {
        where: {
          id: props.passwordResetId,
        },
        select: {
          id: true,
          hrm_time_tracking_owner_id: true,
        },
      },
    );
  if (passwordReset.hrm_time_tracking_owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_owner_password_resets.delete({
    where: {
      id: props.passwordResetId,
    },
  });
}
