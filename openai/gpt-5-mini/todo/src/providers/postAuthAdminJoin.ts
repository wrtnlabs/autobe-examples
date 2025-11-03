import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: ITodoAppAdmin.ICreate;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const { body } = props;

  // Check uniqueness
  const existing = await MyGlobal.prisma.todo_app_admin.findFirst({
    where: { email: body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);

  // Prepare timestamps and ids
  const now = toISOStringSafe(new Date());
  const adminId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;

  // Hash password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Ensure role (Prisma requires role)
  const role = body.role ?? "support";

  // Create admin and session inside try/catch to handle unique-constraint race
  try {
    const admin = await MyGlobal.prisma.todo_app_admin.create({
      data: {
        id: adminId,
        email: body.email,
        password_hash: hashedPassword,
        display_name: body.display_name ?? null,
        role,
        is_active: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
      data: {
        id: sessionId,
        todo_app_admin_id: admin.id,
        ip: body.ip ?? "",
        href: body.href,
        referrer: body.referrer,
        created_at: now,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

    const tokenCreatedAt = now; // reuse same creation timestamp

    const accessToken = jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const token: IAuthorizationToken = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };

    return {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name ?? undefined,
      role: admin.role,
      is_active: admin.is_active,
      createdAt: now,
      updatedAt: now,
      deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
      token,
    } satisfies ITodoAppAdmin.IAuthorized;
  } catch (e: unknown) {
    // Translate Prisma unique violation to 409
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2002" || e.code === "P2002")
    ) {
      throw new HttpException("Email already registered", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
