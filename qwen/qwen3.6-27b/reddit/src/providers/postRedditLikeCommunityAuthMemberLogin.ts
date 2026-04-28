import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityAuthMemberLogin(props: {
  ip: string;
  body: IREdditLikeCommunityMember.ILogin;
}): Promise<IREdditLikeCommunityMember.IAuthorized> {
  const member = await MyGlobal.prisma.reddit_like_community_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: {
        select: {
          display_name: true,
          bio: true,
          karma: true,
        },
      },
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.reddit_like_community_members.update({
    where: { id: member.id },
    data: {
      updated_at: now,
    },
  });
  const session =
    await MyGlobal.prisma.reddit_like_community_member_sessions.create({
      data: {
        id: v4(),
        member: { connect: { id: member.id } },
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: now,
        expired_at: refreshExpiresAt,
      },
    });
  return {
    id: member.id,
    username: member.username,
    email: member.email,
    display_name: member.profile?.display_name ?? null,
    bio: member.profile?.bio ?? null,
    karma: member.profile?.karma ?? 0,
    created_at: member.created_at.toISOString(),
    updated_at: now.toISOString(),
    deleted_at: null,
    token: {
      access: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: session.id,
          created_at: now.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: now.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
  } satisfies IREdditLikeCommunityMember.IAuthorized;
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
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityAuthMemberLogin(props: {
//   ip: string;
//   body: IREdditLikeCommunityMember.ILogin;
// }): Promise<IREdditLikeCommunityMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------