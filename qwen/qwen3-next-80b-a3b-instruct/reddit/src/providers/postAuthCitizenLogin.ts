import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSCitizenILogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenILogin";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postAuthCitizenLogin(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSCitizenILogin;
}): Promise<ICommunityBBSCitizen.IAuthorized> {
  const citizen = await MyGlobal.prisma.community_bbs_citizen.findFirst({
    where: {
      id: props.citizen.id,
      deleted_at: null,
    },
  });

  if (!citizen) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(
    props.body.password,
    citizen.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.community_bbs_citizen_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_bbs_citizen_id: citizen.id,
      ip: props.ip,
      href: props.href,
      referrer: props.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });

  const accessToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: citizen.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityBBSCitizen.IAuthorized;
}
