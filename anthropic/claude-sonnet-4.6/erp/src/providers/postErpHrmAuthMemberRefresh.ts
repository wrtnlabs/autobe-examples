import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberRefresh(props: {
  body: IErpHrmMember.IRefresh;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Verify JWT refresh token — no 'as' assertion; use type-safe extraction
  let decodedId: string;
  let decodedSessionId: string;
  let decodedType: string;
  try {
    const payload = jwt.verify(
      props.body.refresh,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof payload !== "object" || payload === null) {
      throw new HttpException("Invalid token payload", 401);
    }
    const p = payload as Record<string, unknown>;
    if (
      typeof p["id"] !== "string" ||
      typeof p["session_id"] !== "string" ||
      typeof p["type"] !== "string"
    ) {
      throw new HttpException("Invalid token claims", 401);
    }
    decodedId = p["id"];
    decodedSessionId = p["session_id"];
    decodedType = p["type"];
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decodedType !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Query session — validate existence
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: {
      id: decodedSessionId,
      erp_hrm_member_id: decodedId,
    },
    select: {
      id: true,
      expired_at: true,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // 4. Check session expiry — compare epoch timestamps, no Date variable
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Load member and verify account is active
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: decodedId },
    ...ErpHrmMemberTransformer.select(),
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // 6. Invalidate old session by setting expired_at to now
  await MyGlobal.prisma.erp_hrm_member_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: new Date(Date.now()),
    },
  });
  // 7. Create new session with new UUID and future expiry
  const newSessionId = v4();
  const accessExpiresIso: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresIso: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: newSessionId,
      ip: "",
      href: "",
      referrer: "",
      created_at: new Date(Date.now()),
      expired_at: new Date(refreshExpiresIso),
      member: { connect: { id: decodedId } },
    },
  });
  // 8. Sign new access and refresh tokens using new session id
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decodedId,
      session_id: newSessionId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: decodedId,
      session_id: newSessionId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Transform member record and build authorized response
  const memberDto = await ErpHrmMemberTransformer.transform(member);
  return {
    id: memberDto.id,
    email: memberDto.email,
    created_at: memberDto.created_at,
    updated_at: memberDto.updated_at,
    deleted_at: memberDto.deleted_at,
    member: memberDto,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    } satisfies IAuthorizationToken,
  } satisfies IErpHrmMember.IAuthorized;
}
