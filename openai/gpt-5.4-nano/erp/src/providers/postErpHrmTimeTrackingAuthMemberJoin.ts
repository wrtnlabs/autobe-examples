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

export async function postErpHrmTimeTrackingAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmTimeTrackingMember.IJoin;
}): Promise<IErpHrmTimeTrackingMember.IAuthorized> {
  const email = props.body.email.trim().toLowerCase();
  const existing =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirst({
      where: {
        email,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const tokenResult = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = Date.now();
    const accessExpiresIso = toISOStringSafe(new Date(now + 60 * 60 * 1000));
    const refreshExpiresIso = toISOStringSafe(
      new Date(now + 7 * 24 * 60 * 60 * 1000),
    );
    const createdAtIso = toISOStringSafe(new Date(now));
    await tx.erp_hrm_time_tracking_organizations.create({
      data: {
        id: v4(),
        name: props.body.organizationName,
        description: props.body.organizationDescription,
        logo_url: props.body.organizationLogoUrl ?? null,
        currency_code: props.body.organizationCurrencyCode,
        timezone: props.body.organizationTimezone,
        fiscal_start_month: props.body.organizationFiscalStartMonth,
        created_at: accessExpiresIso satisfies string &
          tags.Format<"date-time">,
        updated_at: accessExpiresIso satisfies string &
          tags.Format<"date-time">,
        deleted_at: null,
      },
      select: { id: true },
    });
    const member = await tx.erp_hrm_time_tracking_members.create({
      data: {
        id: v4(),
        email,
        password_hash: await PasswordUtil.hash(props.body.password),
        created_at: createdAtIso satisfies string & tags.Format<"date-time">,
        updated_at: createdAtIso satisfies string & tags.Format<"date-time">,
        deleted_at: null,
      },
      select: { id: true },
    });
    await tx.erp_hrm_time_tracking_member_email_verifications.create({
      data: {
        id: v4(),
        erp_hrm_time_tracking_member_id: member.id,
        token: v4(),
        href: props.body.href,
        ip: props.ip,
        referrer: props.body.referrer,
        created_at: createdAtIso satisfies string & tags.Format<"date-time">,
        updated_at: createdAtIso satisfies string & tags.Format<"date-time">,
        deleted_at: null,
        expired_at: accessExpiresIso satisfies string &
          tags.Format<"date-time">,
      },
      select: { id: true },
    });
    const session = await tx.erp_hrm_time_tracking_member_sessions.create({
      data: {
        id: v4(),
        erp_hrm_time_tracking_members_id: member.id,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: createdAtIso satisfies string & tags.Format<"date-time">,
        expired_at: accessExpiresIso satisfies string &
          tags.Format<"date-time">,
      },
      select: { id: true },
    });
    const access = jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: createdAtIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
    const refresh = jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAtIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    const token = {
      access,
      refresh,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    } satisfies IAuthorizationToken;
    return {
      memberId: member.id,
      token,
    };
  });
  return {
    id: tokenResult.memberId,
    token: tokenResult.token,
  } satisfies IErpHrmTimeTrackingMember.IAuthorized;
}
