import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthGuestRefresh(props: {
  body: IMultiUserTodoUserProfile.IRefresh;
}): Promise<IMultiUserTodoUserProfile.IAuthorized> {
  const decodedUnknown = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof decodedUnknown !== "object" || decodedUnknown === null) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const decoded: Record<string, unknown> = decodedUnknown as Record<
    string,
    unknown
  >;
  const refreshSessionId = decoded.session_id;
  const refreshActorType = decoded.type;
  const profileId = decoded.id;
  const ownerId = decoded.multi_user_todo_user_id;
  if (refreshActorType !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  if (
    typeof refreshSessionId !== "string" ||
    typeof profileId !== "string" ||
    typeof ownerId !== "string"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const profile =
    await MyGlobal.prisma.multi_user_todo_user_profiles.findUniqueOrThrow({
      where: { id: profileId },
      select: {
        id: true,
        multi_user_todo_user_id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (profile.multi_user_todo_user_id !== ownerId) {
    throw new HttpException("Forbidden", 403);
  }
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      type: "guest",
      id: ownerId,
      session_id: refreshSessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "1h" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: ownerId,
      session_id: refreshSessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "7d" },
  );
  return {
    id: profile.id as string & tags.Format<"uuid">,
    multi_user_todo_user_id: profile.multi_user_todo_user_id as string &
      tags.Format<"uuid">,
    display_name: profile.display_name,
    created_at: profile.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: profile.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      profile.deleted_at === null
        ? null
        : (profile.deleted_at.toISOString() as string &
            tags.Format<"date-time">),
    token: {
      access,
      refresh,
      expired_at: accessExpiresIso as string & tags.Format<"date-time">,
      refreshable_until: refreshableUntilIso as string &
        tags.Format<"date-time">,
    },
  };
}
