import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerator.IUpdate;
}): Promise<ICommunityPlatformModerator> {
  // Step 1: Fetch the moderator by ID, ensuring not soft-deleted
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: props.moderatorId, deleted_at: null },
    });
  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Step 2: Enforce unique email constraint (no other moderator with same email)
  if (props.body.email !== moderator.email) {
    const duplicate =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          email: props.body.email,
          deleted_at: null,
          id: { not: props.moderatorId },
        },
      });
    if (duplicate) {
      throw new HttpException("Email already in use by another moderator", 409);
    }
  }

  // Step 3: Only allow permitted status values and enforce business rule
  const allowedStatuses = ["active", "pending", "suspended", "banned"];
  if (!allowedStatuses.includes(props.body.status)) {
    throw new HttpException("Invalid status value", 400);
  }

  // Step 4: Update moderator with provided fields
  const updated = await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: props.moderatorId },
    data: {
      email: props.body.email,
      status: props.body.status,
      business_status:
        typeof props.body.business_status !== "undefined"
          ? props.body.business_status
          : null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    status: updated.status,
    business_status:
      typeof updated.business_status !== "undefined"
        ? updated.business_status
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
