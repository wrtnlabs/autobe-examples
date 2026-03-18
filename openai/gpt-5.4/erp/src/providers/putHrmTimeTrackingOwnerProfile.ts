import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingManagerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManagerSession";
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

export async function putHrmTimeTrackingOwnerProfile(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingManagerSession.IUpdate;
}): Promise<IHrmTimeTrackingManagerSession> {
  const current =
    await MyGlobal.prisma.hrm_time_tracking_owners.findUniqueOrThrow({
      where: {
        id: props.owner.id,
      },
      select: {
        id: true,
        email: true,
        deactivated_at: true,
        deleted_at: true,
      },
    });
  if (current.deleted_at !== null || current.deactivated_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.displayName !== undefined ||
    props.body.avatarImage !== undefined ||
    props.body.phoneNumber !== undefined
  ) {
    await MyGlobal.prisma.hrm_time_tracking_owners.update({
      where: {
        id: props.owner.id,
      },
      data: {
        updated_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_owners.findUniqueOrThrow({
      where: {
        id: props.owner.id,
      },
      select: {
        email: true,
        deactivated_at: true,
        deleted_at: true,
      },
    });
  if (updated.deleted_at !== null || updated.deactivated_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    displayName: updated.email,
    avatarImage: null,
    phoneNumber: null,
  };
}
