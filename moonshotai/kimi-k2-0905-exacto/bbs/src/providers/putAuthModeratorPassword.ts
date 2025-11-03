import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putAuthModeratorPassword(props: {
  moderator: ModeratorPayload;
  body: IPoliticsBbsModerator.IPassword;
}): Promise<IPoliticsBbsModerator.IAuthorized> {
  const { moderator, body } = props;

  // Verify moderator still exists and is not soft-deleted
  const existingModerator =
    await MyGlobal.prisma.politics_bbs_moderators.findFirst({
      where: {
        id: moderator.id,
        deleted_at: null,
      },
    });

  if (!existingModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Hash the new password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Update moderator password and timestamp
  const updatedModerator = await MyGlobal.prisma.politics_bbs_moderators.update(
    {
      where: { id: moderator.id },
      data: {
        password_hash: passwordHash,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // Generate new tokens for session continuation
  const accessToken = jwt.sign(
    {
      id: updatedModerator.id,
      type: "moderator",
      session_id: moderator.session_id,
    } as ModeratorPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h" },
  );

  const refreshToken = jwt.sign(
    {
      id: updatedModerator.id,
      type: "moderator",
      session_id: moderator.session_id,
    } as ModeratorPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d" },
  );

  // Return complete moderator profile with new tokens
  return {
    id: updatedModerator.id satisfies string as string,
    username: updatedModerator.username,
    email: updatedModerator.email,
    created_at: toISOStringSafe(
      updatedModerator.created_at,
    ) satisfies string as string,
    updated_at: toISOStringSafe(
      updatedModerator.updated_at,
    ) satisfies string as string,
    deleted_at: updatedModerator.deleted_at
      ? toISOStringSafe(updatedModerator.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 30 * 24 * 3600 * 1000),
      ),
    } as IAuthorizationToken,
  };
}
