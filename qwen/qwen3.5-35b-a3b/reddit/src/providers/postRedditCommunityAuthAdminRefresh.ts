import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthAdminRefresh(props: {
  body: IRedditCommunityAdmin.IRefresh;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  const decodedPayload = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as unknown as {
    type: "admin";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    email: string;
    display_name: (string & tags.Format<"date-time">) | null;
    is_active: boolean;
  };
  if (decodedPayload.type !== "admin") {
    throw new HttpException("Invalid token type", 401);
  }
  const decoded: {
    type: "admin";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  } = decodedPayload;
  const session =
    await MyGlobal.prisma.reddit_community_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_admin_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (toISOStringSafe(session.expired_at) <= now) {
    throw new HttpException("Session expired", 401);
  }
  const admin = await MyGlobal.prisma.reddit_community_admins.findUniqueOrThrow(
    {
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!admin.is_active) {
    throw new HttpException("Admin account is inactive", 403);
  }
  if (admin.deleted_at !== null) {
    throw new HttpException("Admin account has been deleted", 403);
  }
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
        email: admin.email,
        display_name: admin.display_name ?? null,
        is_active: admin.is_active,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  await MyGlobal.prisma.reddit_community_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpires) },
  });
  const response: IRedditCommunityAdmin.IAuthorized = {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    display_name: admin.display_name ?? null,
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: null,
    token: token,
  };
  return response;
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
// import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityAuthAdminRefresh(props: {
//   body: IRedditCommunityAdmin.IRefresh;
// }): Promise<IRedditCommunityAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------