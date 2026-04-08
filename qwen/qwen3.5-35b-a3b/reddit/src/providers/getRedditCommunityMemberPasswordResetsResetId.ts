import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityAdminPasswordReset> {
  const record =
    await MyGlobal.prisma.reddit_community_admin_password_resets.findUniqueOrThrow(
      {
        where: {
          id: props.resetId,
        },
        select: {
          id: true,
          reddit_community_admin_id: true,
          email: true,
          token: true,
          expires_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  const admin = await MyGlobal.prisma.reddit_community_admins.findFirstOrThrow({
    where: {
      id: record.reddit_community_admin_id,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const adminSummary: IRedditCommunityAdmin.ISummary = {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : null,
  } satisfies IRedditCommunityAdmin.ISummary;
  const isExpired: boolean = record.expires_at < new Date();
  const response: IRedditCommunityAdminPasswordReset = {
    id: record.id,
    token: record.token,
    email: record.email,
    expires_at: toISOStringSafe(record.expires_at),
    used_at: null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    reddit_community_admin_id: record.reddit_community_admin_id,
    admin: adminSummary,
    is_expired: isExpired,
  } satisfies IRedditCommunityAdminPasswordReset;
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
// import { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
// import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberPasswordResetsResetId(props: {
//   member: MemberPayload;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityAdminPasswordReset> {
//   const record = await MyGlobal.prisma.reddit_community_admin_password_resets.findFirstOrThrow({
//     ...RedditCommunityAdminPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityAdminPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------