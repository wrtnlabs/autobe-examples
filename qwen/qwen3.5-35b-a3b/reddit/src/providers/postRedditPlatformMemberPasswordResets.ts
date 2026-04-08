import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
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

export async function postRedditPlatformMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditPlatformMemberPasswordReset.ICreate;
}): Promise<IRedditPlatformMemberPasswordReset> {
  const email: string & tags.Format<"email"> = props.body.email;
  const memberResult = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: { email: email },
    select: { id: true, username: true, karma: true, created_at: true },
  });
  if (memberResult === null) {
    throw new HttpException("Member not found", 404);
  }
  const rawToken: string = v4().replace(/-/g, "");
  const hashedToken: string = await PasswordUtil.hash(rawToken);
  const now: Date = new Date();
  const expiresAtDate: Date = new Date(now.getTime() + 3600000);
  const member: IRedditPlatformMember.ISummary = {
    id: memberResult.id as string & tags.Format<"uuid">,
    username: memberResult.username,
    karma: memberResult.karma,
    created_at: toISOStringSafe(memberResult.created_at),
  };
  const created =
    await MyGlobal.prisma.reddit_platform_member_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        member_id: memberResult.id,
        token: hashedToken,
        expires_at: expiresAtDate,
        used_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  const result: IRedditPlatformMemberPasswordReset = {
    id: created.id as string & tags.Format<"uuid">,
    member_id: created.member_id as string & tags.Format<"uuid">,
    token: rawToken,
    used_at: null,
    expires_at: toISOStringSafe(expiresAtDate),
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
    deleted_at: null,
    member: member,
  };
  return result;
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
// import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IRedditPlatformMemberPasswordReset.ICreate;
// }): Promise<IRedditPlatformMemberPasswordReset> {
//   const record = await MyGlobal.prisma.reddit_platform_member_password_resets.create({
//     data: await RedditPlatformMemberPasswordResetCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformMemberPasswordResetTransformer.select(),
//   });
//   return await RedditPlatformMemberPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------