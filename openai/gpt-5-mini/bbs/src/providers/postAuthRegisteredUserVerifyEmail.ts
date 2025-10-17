import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function postAuthRegisteredUserVerifyEmail(props: {
  body: IEconPoliticalForumRegisteredUser.IVerifyEmail;
}): Promise<IEconPoliticalForumRegisteredUser.IGenericSuccess> {
  const { body } = props;
  const token = body.token;

  if (!token) {
    throw new HttpException("Bad Request: token is required", 400);
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY);
  } catch (err) {
    throw new HttpException("Invalid or expired token", 400);
  }

  if (!decoded || typeof decoded !== "object") {
    throw new HttpException("Invalid or expired token", 400);
  }

  // Extract user identifier from common JWT claim names
  const candidate =
    (decoded as Record<string, unknown>)["sub"] ??
    (decoded as Record<string, unknown>)["userId"] ??
    (decoded as Record<string, unknown>)["id"];
  if (!candidate || typeof candidate !== "string") {
    throw new HttpException("Invalid or expired token", 400);
  }
  const userId = candidate;

  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUniqueOrThrow(
      {
        where: { id: userId },
      },
    );

  if (user.email_verified) {
    return {
      success: true,
      message: "Email already verified",
      code: "EMAIL_ALREADY_VERIFIED",
    };
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_political_forum_registereduser.update({
    where: { id: userId },
    data: {
      email_verified: true,
      verified_at: now,
      updated_at: now,
    },
  });

  return {
    success: true,
    message: "Email verified successfully",
    code: "EMAIL_VERIFIED",
  };
}
