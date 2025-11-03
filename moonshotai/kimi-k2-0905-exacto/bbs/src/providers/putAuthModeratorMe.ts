import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putAuthModeratorMe(props: {
  moderator: ModeratorPayload;
  body: IPoliticsBbsModerator.IUpdate;
}): Promise<IPoliticsBbsModerator> {
  const { moderator, body } = props;

  // Verify moderator exists and is not suspended before allowing update
  const existing =
    await MyGlobal.prisma.politics_bbs_moderators.findUniqueOrThrow({
      where: {
        id: moderator.id,
      },
    });

  if (existing.deleted_at !== null) {
    throw new HttpException("Moderator account is suspended", 403);
  }

  // Build update data only for provided fields
  const updateData = {
    ...(body.email !== undefined && { email: body.email }),
    ...(body.username !== undefined && { username: body.username }),
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.politics_bbs_moderatorsUpdateInput;

  // Ensure at least one field is being updated
  if (Object.keys(updateData).length === 1) {
    updateData.updated_at = toISOStringSafe(new Date());
  }

  // Perform the update
  const updated = await MyGlobal.prisma.politics_bbs_moderators.update({
    where: { id: moderator.id },
    data: updateData,
  });

  // Return updated moderator with proper date formatting
  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    password_hash: updated.password_hash,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
