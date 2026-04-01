import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingAuthMemberLogin(props: {
  ip: string;
  body: IErpHrmTimeTrackingMember.ILogin;
}): Promise<IErpHrmTimeTrackingMember.IAuthorized> {
  const fail = (): never => {
    throw new HttpException("Invalid credentials", 401);
  };
  const nowMs = Date.now();
  const nowIso = toISOStringSafe(new Date(nowMs));
  const accessExpiresIso = toISOStringSafe(new Date(nowMs + 60 * 60 * 1000));
  const refreshableUntilIso = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  );
  const member = await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      password_hash: true,
    },
  });
  if (!member) {
    return fail();
  }
  const passwordOk = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!passwordOk) {
    return fail();
  }
  const verificationOk =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_email_verifications.findFirst(
      {
        where: {
          erp_hrm_time_tracking_member_id: member.id,
          deleted_at: null,
          expired_at: { gt: nowIso },
        },
        select: { id: true },
      },
    );
  if (!verificationOk) {
    return fail();
  }
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_time_tracking_members_id: member.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: nowIso,
      expired_at: accessExpiresIso,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshableUntilIso,
  };
  return {
    id: member.id,
    token,
  } satisfies IErpHrmTimeTrackingMember.IAuthorized;
}
