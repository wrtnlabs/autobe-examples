import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModeratorTransformer } from "../transformers/CommunityPlatformModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberModerators(props: {
  member: MemberPayload;
  body: ICommunityPlatformModerator.ICreate;
}): Promise<ICommunityPlatformModerator> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { name: props.body.communityName },
      select: { id: true },
    });
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { username: props.body.memberUsername },
      select: { id: true },
    });
  const authority =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
        role: { in: ["owner", "moderator"] },
      },
      select: { id: true },
    });
  if (authority === null) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: targetMember.id,
        community_id: community.id,
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Conflict", 409);
  }
  const now = new Date().toISOString();
  const record = await MyGlobal.prisma.community_platform_moderators.create({
    data: {
      id: v4(),
      role: "moderator",
      created_at: now,
      updated_at: now,
      member: { connect: { id: targetMember.id } },
      community: { connect: { id: community.id } },
      appointedBy: { connect: { id: props.member.id } },
    } satisfies Prisma.community_platform_moderatorsCreateInput,
    ...CommunityPlatformModeratorTransformer.select(),
  });
  return await CommunityPlatformModeratorTransformer.transform(record);
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
// import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberModerators(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformModerator.ICreate;
// }): Promise<ICommunityPlatformModerator> {
//   const record = await MyGlobal.prisma.community_platform_moderators.create({
//     data: await CommunityPlatformModeratorCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformModeratorTransformer.select(),
//   });
//   return await CommunityPlatformModeratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------