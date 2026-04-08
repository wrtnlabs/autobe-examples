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

export async function postMultiUserTodoAuthGuestJoin(props: {
  ip: string;
  body: IMultiUserTodoUserProfile.IJoin;
}): Promise<IMultiUserTodoUserProfile.IAuthorized> {
  void props.ip;
  void props.body.password;
  void props.body.href;
  void props.body.referrer;
  const now = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date()),
  );
  const profileId = typia.assert<string & tags.Format<"uuid">>(v4());
  const userId = typia.assert<string & tags.Format<"uuid">>(v4());
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  const created = await MyGlobal.prisma.multi_user_todo_user_profiles.create({
    data: {
      id: profileId,
      multi_user_todo_user_id: userId,
      display_name: props.body.display_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      multi_user_todo_user_id: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const expiredAt = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const refreshableUntil = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(created.created_at),
  );
  const updatedAt = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(created.updated_at),
  );
  const deletedAt =
    created.deleted_at === null
      ? null
      : typia.assert<string & tags.Format<"date-time">>(
          toISOStringSafe(created.deleted_at),
        );
  const access = jwt.sign(
    {
      type: "guest",
      id: typia.assert<string & tags.Format<"uuid">>(
        created.multi_user_todo_user_id,
      ),
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: typia.assert<string & tags.Format<"uuid">>(
        created.multi_user_todo_user_id,
      ),
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: typia.assert<string & tags.Format<"uuid">>(created.id),
    multi_user_todo_user_id: typia.assert<string & tags.Format<"uuid">>(
      created.multi_user_todo_user_id,
    ),
    display_name: created.display_name,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    token,
  };
}
