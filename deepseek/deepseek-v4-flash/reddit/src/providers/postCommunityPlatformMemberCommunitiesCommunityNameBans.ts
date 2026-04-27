import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformBanCollector } from "../collectors/CommunityPlatformBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityPlatformBan.ICreate;
}): Promise<ICommunityPlatformBan> {
  // Resolve the community by its unique canonical name
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Authorization: member must be the community owner or a moderator
  if (props.member.id !== community.owner_id) {
    const assignment =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          member_id: props.member.id,
          community_id: community.id,
          role: "moderator",
        },
        select: { id: true },
      });
    if (assignment === null) {
      throw new HttpException(
        "You are not a moderator or owner of this community",
        403,
      );
    }
  }
  // Section 214: Cannot ban the community owner from their own community
  if (props.body.member_id === community.owner_id) {
    throw new HttpException(
      "Cannot ban the community owner from their own community",
      400,
    );
  }
  // Verify the target member exists and is active (not soft-deleted)
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: {
        id: props.body.member_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (targetMember === null) {
    throw new HttpException("Target member not found", 404);
  }
  // Section 208-209: Check for duplicate active ban — provide clear 409
  const existingBan = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      community_platform_community_id: community.id,
      community_platform_member_id: props.body.member_id,
    },
    select: { id: true },
  });
  if (existingBan !== null) {
    throw new HttpException(
      "This member is already banned from this community",
      409,
    );
  }
  // Create the ban record using the Collector (handles UUID, timestamps via new Date() for Prisma)
  const record = await MyGlobal.prisma.community_platform_bans.create({
    data: await CommunityPlatformBanCollector.collect({
      body: props.body,
      communityPlatformCommunities: { id: community.id },
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityPlatformBanTransformer.select(),
  });
  // Transform to API response DTO (converts Prisma DateTime to ISO string)
  return await CommunityPlatformBanTransformer.transform(record);
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
// import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberCommunitiesCommunityNameBans(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: ICommunityPlatformBan.ICreate;
// }): Promise<ICommunityPlatformBan> {
//   const record = await MyGlobal.prisma.community_platform_bans.create({
//     data: await CommunityPlatformBanCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformBanTransformer.select(),
//   });
//   return await CommunityPlatformBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------