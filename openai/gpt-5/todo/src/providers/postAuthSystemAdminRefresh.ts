import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSystemAdminRefresh(props: {
  body: ITodoListSystemAdmin.IRefresh;
}): Promise<ITodoListSystemAdmin.IAuthorized> {
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );

    const verifiedUnknown: unknown = verified;
    // Define payload type inline to avoid missing type and ensure correct tags/literals
    const payload = typia.assert<{
      id: string & tags.Format<"uuid">;
      type: "systemadmin";
    }>(verifiedUnknown);

    const admin = await MyGlobal.prisma.todo_list_system_admins.findUnique({
      where: { id: payload.id satisfies string as string },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    if (!admin || admin.deleted_at !== null) {
      throw new HttpException("Unauthorized", 401);
    }

    const accessPayload = { id: payload.id, type: "systemadmin" as const };
    const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    });

    const refreshToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    });

    const nowMs = Date.now();
    const accessExpiredAt = toISOStringSafe(new Date(nowMs + 60 * 60 * 1000));
    const refreshableUntil = toISOStringSafe(
      new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
    );

    return typia.assert<ITodoListSystemAdmin.IAuthorized>({
      id: payload.id,
      email: admin.email,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiredAt,
        refreshable_until: refreshableUntil,
      },
      admin: {
        id: payload.id,
        email: admin.email,
        created_at: toISOStringSafe(admin.created_at),
        updated_at: toISOStringSafe(admin.updated_at),
        deleted_at:
          admin.deleted_at !== null ? toISOStringSafe(admin.deleted_at) : null,
      },
    });
  } catch {
    throw new HttpException("Unauthorized", 401);
  }
}
