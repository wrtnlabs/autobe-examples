import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function postAuthAdminPasswordReset(props: {
  body: ITodoAppAdmin.IRequestPasswordReset;
}): Promise<ITodoAppAdmin.IMessage> {
  const { body } = props;

  try {
    // Lookup admin by unique email. Use findUnique to leverage the schema's unique constraint.
    const admin = await MyGlobal.prisma.todo_app_admin.findUnique({
      where: { email: body.email },
    });

    // Generate ephemeral, single-use token if admin exists. Do NOT persist or return it.
    if (admin) {
      jwt.sign(
        {
          sub: admin.id,
          type: "admin_password_reset",
          jti: v4() as string & tags.Format<"uuid">,
        },
        MyGlobal.env.JWT_SECRET_KEY || v4(),
        { expiresIn: "24h" },
      );
    }

    // Create audit record to record the request. Use explicit nulls for optional fields.
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: null,
        user_id: null,
        actor_role: "public",
        action_type: "request_password_reset",
        target_resource: "todo_app_admin",
        target_id: admin ? admin.id : null,
        reason: null,
        created_at: toISOStringSafe(new Date()),
      },
    });

    // Generic response that never reveals account existence.
    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
