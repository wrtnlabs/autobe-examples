import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberTransformer } from "../transformers/RedditPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberProfile(props: {
  member: MemberPayload;
  body: IRedditPlatformMember.IUpdate;
}): Promise<IRedditPlatformMember> {
  const { display_name, bio, avatar_url } = props.body;
  // Validate at least one field is provided
  if (
    display_name === undefined &&
    bio === undefined &&
    avatar_url === undefined
  ) {
    throw new HttpException("At least one field must be provided", 400);
  }
  // Validate display_name if provided: must not be null, empty, or whitespace-only
  if (display_name !== undefined) {
    if (
      display_name === null ||
      typeof display_name !== "string" ||
      display_name.trim().length === 0
    ) {
      throw new HttpException("Display name cannot be blank", 400);
    }
  }
  // Validate avatar_url if provided: must be valid URI
  if (avatar_url !== undefined && avatar_url !== null) {
    try {
      new URL(avatar_url);
    } catch {
      throw new HttpException("Invalid avatar URL format", 400);
    }
  }
  // Query member record with full select
  const record = await MyGlobal.prisma.reddit_platform_members.findFirstOrThrow(
    {
      ...RedditPlatformMemberTransformer.select(),
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    },
  );
  // Update member record with timestamp
  await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: props.member.id },
    data: { updated_at: toISOStringSafe(new Date()) },
  });
  // Query updated member for response
  const updated =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      ...RedditPlatformMemberTransformer.select(),
      where: { id: props.member.id },
    });
  return await RedditPlatformMemberTransformer.transform(updated);
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
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberProfile(props: {
//   member: MemberPayload;
//   body: IRedditPlatformMember.IUpdate;
// }): Promise<IRedditPlatformMember> {
//   const record = await MyGlobal.prisma.reddit_platform_members.findFirstOrThrow({
//     ...RedditPlatformMemberTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------