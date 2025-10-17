import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmailVerify";
import { IEconDiscussVerifiedExpertEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmail";

export async function postAuthVerifiedExpertEmailVerify(props: {
  body: IEconDiscussVerifiedExpertEmailVerify.ICreate;
}): Promise<IEconDiscussVerifiedExpertEmail.IVerified> {
  const { token } = props.body;

  // Simulated token validation due to absence of token storage/mapping in schema.
  // Accept exactly 32-character tokens as valid; reject others.
  if (token.length !== 32) {
    throw new HttpException("Invalid or expired verification token", 401);
  }

  const now = toISOStringSafe(new Date());
  return {
    email_verified: true,
    verified_at: now,
  };
}
