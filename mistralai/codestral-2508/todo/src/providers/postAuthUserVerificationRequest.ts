import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserVerificationRequest(props: {
  body: ITodoListUser.IResendVerification;
}): Promise<ITodoListUser.IVerificationStatus> {
  try {
    // Always return 'neutral' even if email is not registered
    const user = await MyGlobal.prisma.todo_list_users.findUnique({
      where: { email: props.body.email },
      select: { id: true },
    });

    if (user) {
      // A real implementation would persist & send a secure token via email
      const token = v4();
      // [Simulated] Send verification email with token
      // sendVerificationEmail(props.body.email, token); // Not implemented
    }

    // Always return true to avoid revealing account status (privacy requirement)
    return { delivered: true };
  } catch (err) {
    // Only infrastructure/database failure should return false
    return { delivered: false };
  }
}
