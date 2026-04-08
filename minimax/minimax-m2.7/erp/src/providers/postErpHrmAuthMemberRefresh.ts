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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberRefresh(props: {
  body: IErpHrmMember.IRefresh;
}): Promise<IErpHrmMember.IAuthorized> {
  // Define JWT payload interface for type safety
  interface IJwtPayload {
    type: string;
    id: string;
    session_id: string;
    created_at?: string;
    tokenType?: string;
  }
  // 1. Verify refresh token with explicit type narrowing
  let decoded: IJwtPayload;
  {
    const verified = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof verified !== "object" ||
      verified === null ||
      typeof (verified as Record<string, unknown>).type !== "string" ||
      typeof (verified as Record<string, unknown>).id !== "string" ||
      typeof (verified as Record<string, unknown>).session_id !== "string"
    ) {
      throw new HttpException("Invalid token payload structure", 401);
    }
    decoded = verified as unknown as IJwtPayload;
  }
  // 2. Validate token type is member
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type for member refresh", 403);
  }
  // 3. Find session by refresh_token with member relation
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refreshToken,
      erp_hrm_member_id: decoded.id,
    },
    select: {
      id: true,
      erp_hrm_member_id: true,
      expired_at: true,
      token_expired_at: true,
      member: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_uri: true,
          phone: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  // 4. Validate session exists
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate session not expired (ISO string comparison)
  const now: string & tags.Format<"date-time"> = ((): string &
    tags.Format<"date-time"> => {
    const d = new Date();
    return d.toISOString() as string & tags.Format<"date-time">;
  })();
  const sessionExpiredAt: string & tags.Format<"date-time"> = ((): string &
    tags.Format<"date-time"> => {
    const d = new Date(session.expired_at);
    return d.toISOString() as string & tags.Format<"date-time">;
  })();
  if (sessionExpiredAt < now) {
    throw new HttpException(
      "Refresh token has expired. Please login again.",
      401,
    );
  }
  // 6. Validate member not deleted
  if (session.member.deleted_at !== null) {
    throw new HttpException("Account has been deactivated", 403);
  }
  // 7. Generate new access and refresh tokens with expiration timestamps
  const accessExpiresAt: string & tags.Format<"date-time"> = ((): string &
    tags.Format<"date-time"> => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return d.toISOString() as string & tags.Format<"date-time">;
  })();
  const refreshExpiresAt: string & tags.Format<"date-time"> = ((): string &
    tags.Format<"date-time"> => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return d.toISOString() as string & tags.Format<"date-time">;
  })();
  const newAccessToken: string = jwt.sign(
    {
      type: "member",
      id: session.member.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "member",
      id: session.member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with new tokens and expiration times
  await MyGlobal.prisma.erp_hrm_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_expired_at: new Date(accessExpiresAt),
      expired_at: new Date(refreshExpiresAt),
    },
  });
  // 9. Return authorized response with member info and new tokens
  return {
    id: session.member.id,
    email: session.member.email,
    display_name: session.member.display_name,
    avatar_uri: session.member.avatar_uri,
    phone: session.member.phone,
    created_at: ((): string & tags.Format<"date-time"> => {
      const d = new Date(session.member.created_at);
      return d.toISOString() as string & tags.Format<"date-time">;
    })(),
    updated_at: ((): string & tags.Format<"date-time"> => {
      const d = new Date(session.member.updated_at);
      return d.toISOString() as string & tags.Format<"date-time">;
    })(),
    deleted_at:
      session.member.deleted_at !== null
        ? ((): string & tags.Format<"date-time"> => {
            const d = new Date(session.member.deleted_at);
            return d.toISOString() as string & tags.Format<"date-time">;
          })()
        : null,
    displayName: session.member.display_name,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAuthMemberRefresh(props: {
//   body: IErpHrmMember.IRefresh;
// }): Promise<IErpHrmMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------