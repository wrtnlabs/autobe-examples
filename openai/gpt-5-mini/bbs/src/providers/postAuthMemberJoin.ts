import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: IDiscussionBoardMember.IJoin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  // Check uniqueness (username or email) before attempting create to provide clear conflict error
  const existing = await MyGlobal.prisma.discussion_board_member.findFirst({
    where: {
      OR: [{ username: body.username }, { email: body.email }],
    },
  });

  if (existing) {
    if (existing.username === body.username) {
      throw new HttpException("Username already registered", 409);
    }
    if (existing.email === body.email) {
      throw new HttpException("Email already registered", 409);
    }
    throw new HttpException(
      "Conflict: username or email already registered",
      409,
    );
  }

  // Hash password (MANDATORY)
  const password_hash = await PasswordUtil.hash(body.password);

  // Prepare deterministic values
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const verificationId = v4() as string & tags.Format<"uuid">;
  const verificationToken = v4();

  const now = toISOStringSafe(new Date());
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshExpiresIso = toISOStringSafe(refreshExpiresDate);
  const verificationExpiresIso = toISOStringSafe(
    new Date(Date.now() + 48 * 60 * 60 * 1000),
  );

  try {
    // Create member record
    const created = await MyGlobal.prisma.discussion_board_member.create({
      data: {
        id: memberId,
        username: body.username,
        email: body.email,
        password_hash,
        display_name: body.display_name ?? null,
        role: "USER",
        mfa_enabled: false,
        created_at: now,
        updated_at: now,
      },
    });

    // Create email verification artifact
    await MyGlobal.prisma.discussion_board_email_verifications.create({
      data: {
        id: verificationId,
        discussion_board_member_id: created.id,
        token: verificationToken,
        created_at: now,
        expires_at: verificationExpiresIso,
      },
    });

    // Create initial session
    const session =
      await MyGlobal.prisma.discussion_board_member_sessions.create({
        data: {
          id: sessionId,
          discussion_board_member_id: created.id,
          ip: body.ip ?? "",
          href: body.href,
          referrer: body.referrer,
          created_at: now,
          expired_at: accessExpiresIso,
        },
      });

    // Build JWT payloads
    const jwtCreatedAt = now;
    const accessToken = jwt.sign(
      {
        type: "member",
        id: created.id,
        session_id: session.id,
        created_at: jwtCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      {
        type: "member",
        id: created.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: jwtCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    // Return authorized response
    return {
      id: created.id,
      username: created.username,
      email: created.email,
      display_name: created.display_name ?? null,
      role: created.role ?? "USER",
      mfa_enabled: created.mfa_enabled ?? false,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiresIso,
        refreshable_until: refreshExpiresIso,
      },
      member: {
        id: created.id,
        username: created.username,
        display_name: created.display_name ?? null,
        created_at: now,
      },
    };
  } catch (err) {
    // Prisma unique constraint error handling
    if ((err as any)?.code === "P2002") {
      throw new HttpException("Conflict: duplicate field", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
