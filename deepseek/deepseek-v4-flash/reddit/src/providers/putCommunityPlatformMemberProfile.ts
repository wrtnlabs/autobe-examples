import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileTransformer } from "../transformers/CommunityPlatformProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityPlatformProfile.IUpdate;
}): Promise<ICommunityPlatformProfile> {
  const existing = await MyGlobal.prisma.community_platform_profiles.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing === null) {
    throw new HttpException("Profile not found", 404);
  }
  if (
    props.body.display_name === undefined &&
    props.body.biography === undefined &&
    props.body.avatar_uri === undefined
  ) {
    throw new HttpException("No updatable fields provided", 400);
  }
  if (
    props.body.display_name !== undefined &&
    props.body.display_name.trim().length === 0
  ) {
    throw new HttpException(
      "Display name cannot be empty or whitespace only",
      400,
    );
  }
  const now = new Date().toISOString();
  const updateData: Prisma.community_platform_profilesUpdateInput = {
    updated_at: now,
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.biography !== undefined) {
    updateData.biography = props.body.biography;
  }
  if (props.body.avatar_uri !== undefined) {
    updateData.avatar_uri = props.body.avatar_uri;
  }
  await MyGlobal.prisma.community_platform_profiles.update({
    where: { id: existing.id },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.community_platform_profiles.findUniqueOrThrow({
      where: { id: existing.id },
      ...CommunityPlatformProfileTransformer.select(),
    });
  return await CommunityPlatformProfileTransformer.transform(updated);
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
// import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityPlatformMemberProfile(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformProfile.IUpdate;
// }): Promise<ICommunityPlatformProfile> {
//   await MyGlobal.prisma.community_platform_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_platform_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityPlatformProfileTransformer.select(),
//   });
//   return await CommunityPlatformProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------