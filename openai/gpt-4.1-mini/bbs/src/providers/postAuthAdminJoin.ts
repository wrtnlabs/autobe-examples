import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { body } = props;
  try {
    const now = toISOStringSafe(new Date());
    const newId = v4() as string & tags.Format<"uuid">;
    const hashedPassword = await PasswordUtil.hash(body.password);

    const created = await MyGlobal.prisma.discussion_board_admins.create({
      data: {
        id: newId,
        email: body.email,
        password_hash: hashedPassword,
        display_name: body.displayName,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    const accessExpiredAtISO = toISOStringSafe(
      new Date(Date.now() + 3600 * 1000),
    );
    const refreshExpiredAtISO = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 3600 * 1000),
    );

    const accessToken = jwt.sign(
      {
        userId: created.id,
        email: created.email,
        type: "admin",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        userId: created.id,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    return {
      id: created.id,
      email: created.email,
      password_hash: created.password_hash,
      display_name: created.display_name,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null && created.deleted_at !== undefined
          ? toISOStringSafe(created.deleted_at)
          : null,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiredAtISO,
        refreshable_until: refreshExpiredAtISO,
      },
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException("Duplicate email address", 409);
      }
    }
    throw err;
  }
}
