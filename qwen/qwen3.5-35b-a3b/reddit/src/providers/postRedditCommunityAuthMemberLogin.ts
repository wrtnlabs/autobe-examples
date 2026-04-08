import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthMemberLogin(props: {
  ip: string;
  body: IRedditCommunityMember.ILogin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpiresTime = Date.now() + 60 * 60 * 1000;
  const refreshExpiresTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: v4(),
        reddit_community_member_id: member.id,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expired_at: new Date(accessExpiresTime).toISOString(),
      },
    },
  );
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: new Date(accessExpiresTime).toISOString(),
    refreshable_until: new Date(refreshExpiresTime).toISOString(),
  };
  const response: IRedditCommunityMember.IAuthorized = {
    id: member.id,
    email: member.email,
    username: member.username,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
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
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityAuthMemberLogin(props: {
//   ip: string;
//   body: IRedditCommunityMember.ILogin;
// }): Promise<IRedditCommunityMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------