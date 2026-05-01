import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommunityModeratorCollector } from "../collectors/CommunityHubCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubCommunityModeratorTransformer } from "../transformers/CommunityHubCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityHubCommunityModerator.ICreate;
}): Promise<ICommunityHubCommunityModerator> {
  const community =
    await MyGlobal.prisma.community_hub_communities.findFirstOrThrow({
      where: {
        name: { equals: props.communityName, mode: "insensitive" },
        deleted_at: null,
      },
      select: { id: true },
    });
  const authRole =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (authRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember =
    await MyGlobal.prisma.community_hub_members.findFirstOrThrow({
      where: {
        username: props.body.username,
        deleted_at: null,
      },
      select: { id: true },
    });
  const existingRole =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: targetMember.id,
      },
      ...CommunityHubCommunityModeratorTransformer.select(),
    });
  if (existingRole !== null) {
    return await CommunityHubCommunityModeratorTransformer.transform(
      existingRole,
    );
  }
  const activeBan =
    await MyGlobal.prisma.community_hub_community_bans.findFirst({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: targetMember.id,
        unbanned_at: null,
      },
      select: { id: true },
    });
  if (activeBan !== null) {
    throw new HttpException("User is banned from this community", 400);
  }
  const record =
    await MyGlobal.prisma.community_hub_community_moderators.create({
      data: await CommunityHubCommunityModeratorCollector.collect({
        body: props.body,
        communityHubCommunities: { id: community.id },
        communityHubMembers: { id: props.member.id },
        communityHubMemberSessions: { id: props.member.session_id },
      }),
      ...CommunityHubCommunityModeratorTransformer.select(),
    });
  return await CommunityHubCommunityModeratorTransformer.transform(record);
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
// import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubMemberCommunitiesCommunityNameModerators(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: ICommunityHubCommunityModerator.ICreate;
// }): Promise<ICommunityHubCommunityModerator> {
//   const record = await MyGlobal.prisma.community_hub_community_moderators.create({
//     data: await CommunityHubCommunityModeratorCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityHubCommunityModeratorTransformer.select(),
//   });
//   return await CommunityHubCommunityModeratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------