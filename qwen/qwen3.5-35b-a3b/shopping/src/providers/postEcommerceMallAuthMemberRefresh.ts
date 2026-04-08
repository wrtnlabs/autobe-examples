import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthMemberRefresh(props: {
  body: IEcommerceMallMember.IRefresh;
}): Promise<IEcommerceMallMember.IAuthorized> {
  const tokenPayload = typia.assert<{
    id: string;
    session_id: string;
    type: string;
  }>(
    jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );
  if (tokenPayload.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  const memberId: string & tags.Format<"uuid"> = tokenPayload.id;
  const sessionId: string & tags.Format<"uuid"> = tokenPayload.session_id;
  const session =
    await MyGlobal.prisma.ecommerce_mall_member_sessions.findFirst({
      where: {
        id: sessionId,
        ecommerce_mall_member_id: memberId,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now: Date = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  const member = await MyGlobal.prisma.ecommerce_mall_members.findUniqueOrThrow(
    {
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const access: string = jwt.sign(
    {
      type: "member" as const,
      id: memberId,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    {
      type: "member" as const,
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_member_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: access,
      refresh_token: refresh,
      expired_at: accessExpires,
    },
  });
  const expired_at: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshable_until: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at,
    refreshable_until,
  };
  return {
    id: memberId,
    email: member.email,
    display_name: member.display_name,
    phone_number: member.phone_number,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    access,
    refresh,
    expired_at,
    token,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthMemberRefresh(props: {
//   body: IEcommerceMallMember.IRefresh;
// }): Promise<IEcommerceMallMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------