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

export async function postRedditCommunityAuthMemberRefresh(props: {
  body: IRedditCommunityMember.IRefresh;
}): Promise<IRedditCommunityMember.IAuthorized> {
  const decodedPayload = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  ) as IJwtSignIn;
  const sessionIdFromToken: string & tags.Format<"uuid"> =
    decodedPayload.session_id;
  const memberSessionRecord =
    await MyGlobal.prisma.reddit_community_member_sessions.findFirst({
      where: {
        id: sessionIdFromToken,
        deleted_at: null,
      },
    });
  if (memberSessionRecord === null) {
    throw new HttpException("Session not found", 404);
  }
  const nowDateTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const sessionExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    memberSessionRecord.expired_at,
  );
  if (sessionExpiredAt <= nowDateTime) {
    throw new HttpException("Session expired", 401);
  }
  const accessExpiresDateTime: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpiresDateTime: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const newAccessToken: string = jwt.sign(
    {
      type: "member",
      id: memberSessionRecord.reddit_community_member_id,
      session_id: memberSessionRecord.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "member",
      id: memberSessionRecord.reddit_community_member_id,
      session_id: memberSessionRecord.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: memberSessionRecord.id },
    data: {
      expired_at: new Date(accessExpiresDateTime),
    },
  });
  const memberRecord =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: memberSessionRecord.reddit_community_member_id },
      select: {
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const responseAuthorized: IRedditCommunityMember.IAuthorized = {
    id: memberSessionRecord.reddit_community_member_id,
    email: memberRecord.email,
    username: memberRecord.username,
    created_at: toISOStringSafe(memberRecord.created_at),
    updated_at: toISOStringSafe(memberRecord.updated_at),
    deleted_at:
      memberRecord.deleted_at !== null
        ? toISOStringSafe(memberRecord.deleted_at)
        : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresDateTime,
      refreshable_until: refreshExpiresDateTime,
    },
  };
  return responseAuthorized;
}
interface IJwtSignIn {
  type: string;
  id: string;
  session_id: string;
  created_at: string;
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
// export async function postRedditCommunityAuthMemberRefresh(props: {
//   body: IRedditCommunityMember.IRefresh;
// }): Promise<IRedditCommunityMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------