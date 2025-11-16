import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorAdministratorsAdministratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdministrator.IUpdate;
}): Promise<ICommunityPlatformAdministrator> {
  // Step 1: Find the existing admin account
  const target =
    await MyGlobal.prisma.community_platform_administrators.findUnique({
      where: { id: props.administratorId },
    });
  if (!target) {
    throw new HttpException("Administrator not found.", 404);
  }
  // Prevent update if hard-deleted (terminated, i.e., deleted_at is not null and status is 'terminated')
  if (target.status === "terminated") {
    throw new HttpException("Administrator is permanently deleted.", 400);
  }

  // Step 2: If updating email, check uniqueness
  if (props.body.email !== undefined && props.body.email !== target.email) {
    const exists =
      await MyGlobal.prisma.community_platform_administrators.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.administratorId },
        },
      });
    if (exists) {
      throw new HttpException(
        "Email address already in use by another administrator.",
        409,
      );
    }
  }

  // Step 3: Prepare update data, refreshing updated_at
  const updateData: Record<string, unknown> = {
    ...props.body,
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 4: Update and return
  const updated =
    await MyGlobal.prisma.community_platform_administrators.update({
      where: { id: props.administratorId },
      data: updateData,
    });
  return {
    id: updated.id,
    email: updated.email,
    status: updated.status,
    business_status:
      typeof updated.business_status === "undefined"
        ? undefined
        : updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  };
}
