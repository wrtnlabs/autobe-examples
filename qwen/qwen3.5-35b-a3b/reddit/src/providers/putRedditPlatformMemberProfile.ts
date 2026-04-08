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

export async function putRedditPlatformMemberProfile(props: {
  member: MemberPayload;
  body: IRedditPlatformMember.IUpdate;
}): Promise<IRedditPlatformMember> {
  // Validate display_name if provided: cannot be blank or whitespace-only
  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null &&
    typeof props.body.display_name === "string" &&
    props.body.display_name.trim().length === 0
  ) {
    throw new HttpException("Display name cannot be blank", 400);
  }
  // Validate avatar_url format if provided (must be valid URI)
  if (props.body.avatar_url !== undefined && props.body.avatar_url !== null) {
    try {
      new URL(props.body.avatar_url);
      // Ensure it's http or https
      const parsed = new URL(props.body.avatar_url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new HttpException("Avatar URL must be http or https", 400);
      }
    } catch {
      throw new HttpException("Invalid avatar URL format", 400);
    }
  }
  // Build partial update data with only fields from the body
  const updateData: Prisma.reddit_platform_membersUpdateInput = {
    updated_at: new Date(),
    ...(props.body.display_name !== undefined && {
      username: props.body.display_name,
    }),
  };
  // Update the member record
  await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: props.member.id },
    data: updateData,
  });
  // Fetch updated record with transformer selection
  const updated =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...RedditPlatformMemberTransformer.select(),
    });
  // Transform and return
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
// export async function putRedditPlatformMemberProfile(props: {
//   member: MemberPayload;
//   body: IRedditPlatformMember.IUpdate;
// }): Promise<IRedditPlatformMember> {
//   await MyGlobal.prisma.reddit_platform_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
//     where: { ... },
//     ...RedditPlatformMemberTransformer.select(),
//   });
//   return await RedditPlatformMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------