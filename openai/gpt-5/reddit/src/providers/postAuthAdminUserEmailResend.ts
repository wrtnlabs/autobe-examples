import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminUserEmailResend } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserEmailResend";
import { ICommunityPlatformAdminUserVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserVerification";
import { IEAdminVerificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminVerificationStatus";

export async function postAuthAdminUserEmailResend(props: {
  body: ICommunityPlatformAdminUserEmailResend.ICreate;
}): Promise<ICommunityPlatformAdminUserVerification.ISummary> {
  const body = props.body;

  const hasEmail = body && body.email !== undefined && body.email !== null;
  const hasUsername =
    body && body.username !== undefined && body.username !== null;

  if (!hasEmail && !hasUsername) {
    throw new HttpException("Bad Request: email or username is required.", 400);
  }

  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      deleted_at: null,
      ...(hasEmail ? { email: body.email } : {}),
      ...(hasUsername ? { username: body.username } : {}),
    },
    select: {
      id: true,
      email_verified: true,
    },
  });

  if (!user) {
    throw new HttpException("Not Found", 404);
  }

  if (user.email_verified === true) {
    throw new HttpException("Conflict: Email already verified.", 409);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: { updated_at: now },
  });

  return {
    ok: true,
    status: "sent",
    message: "Verification email sent.",
  };
}
