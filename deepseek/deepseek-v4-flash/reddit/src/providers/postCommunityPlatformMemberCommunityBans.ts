import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBanCollector } from "../collectors/CommunityPlatformCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunityBans(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // 1. Resolve communityCode (unique name) to community_platform_communities.id
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.body.communityCode },
      select: { id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Resolve memberCode (unique username) to community_platform_members.id
  const bannedMember =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { username: props.body.memberCode },
      select: { id: true },
    });
  if (bannedMember === null) {
    throw new HttpException("Member not found", 404);
  }
  // 3. Verify the requesting member has moderator or owner authority in the target community
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
        role: { in: ["owner", "moderator"] },
      },
      select: { id: true },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify the requesting member is not themselves banned from this community
  const selfBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: community.id,
        community_platform_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (selfBan !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Verify the target member is not already banned (unique constraint enforcement)
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: community.id,
        community_platform_member_id: bannedMember.id,
      },
      select: { id: true },
    });
  if (existingBan !== null) {
    throw new HttpException("Conflict", 409);
  }
  // 6. Create the ban record using the collector
  //    The collector internally generates UUID, resolves communityCode/memberCode again
  //    (safe because records were verified above), handles Prisma Date objects for DateTime columns,
  //    and produces the complete Prisma CreateInput.
  const record = await MyGlobal.prisma.community_platform_community_bans.create(
    {
      data: await CommunityPlatformCommunityBanCollector.collect({
        body: props.body,
        communityPlatformMembers: { id: props.member.id } satisfies IEntity,
        communityPlatformMemberSessions: {
          id: props.member.session_id,
        } satisfies IEntity,
      }),
      ...CommunityPlatformCommunityBanTransformer.select(),
    },
  );
  // 7. Return the created ban record using the transformer
  return await CommunityPlatformCommunityBanTransformer.transform(record);
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
// import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberCommunityBans(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformCommunityBan.ICreate;
// }): Promise<ICommunityPlatformCommunityBan> {
//   const record = await MyGlobal.prisma.community_platform_community_bans.create({
//     data: await CommunityPlatformCommunityBanCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformCommunityBanTransformer.select(),
//   });
//   return await CommunityPlatformCommunityBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------