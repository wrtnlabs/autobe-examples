import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityOwnerEmailVerify(props: {
  body: ICommunityPlatformCommunityOwner.IVerifyEmail;
}): Promise<ICommunityPlatformCommunityOwner.IAuthorized> {
  const { verification_token } = props.body;

  if (!MyGlobal.testing) {
    throw new HttpException("Invalid or expired verification artifact", 400);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  try {
    const candidate =
      await MyGlobal.prisma.community_platform_users.findFirstOrThrow({
        where: {
          deleted_at: null,
          email_verified: false,
        },
        orderBy: { created_at: "desc" },
      });

    const nextState: string =
      candidate.account_state === "PendingVerification"
        ? "Active"
        : candidate.account_state;

    const updated = await MyGlobal.prisma.community_platform_users.update({
      where: { id: candidate.id },
      data: {
        email_verified: true,
        account_state: nextState,
        updated_at: now,
        last_login_at: now,
      },
      select: { id: true },
    });

    const secret = MyGlobal.env.JWT_SECRET_KEY;
    if (!secret)
      throw new HttpException(
        "Server misconfiguration: missing JWT secret",
        500,
      );

    const accessTtlSeconds = 60 * 60; // 1 hour
    const refreshTtlSeconds = 60 * 60 * 24 * 30; // 30 days

    const accessToken = jwt.sign(
      { sub: updated.id, role: "communityOwner", typ: "access" },
      secret,
      { expiresIn: accessTtlSeconds },
    );

    const refreshToken = jwt.sign(
      { sub: updated.id, role: "communityOwner", typ: "refresh" },
      secret,
      { expiresIn: refreshTtlSeconds },
    );

    const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(Date.now() + accessTtlSeconds * 1000),
    );
    const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(Date.now() + refreshTtlSeconds * 1000),
    );

    return {
      id: updated.id as string & tags.Format<"uuid">,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiredAt,
        refreshable_until: refreshableUntil,
      },
      role: "communityOwner",
    };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "P2025"
    )
      throw new HttpException(
        "Not Found: user pending verification not found",
        404,
      );

    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
