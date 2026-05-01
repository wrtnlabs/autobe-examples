import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommunityBanCollector } from "../collectors/CommunityHubCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubCommunityBanTransformer } from "../transformers/CommunityHubCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityHubCommunityBan.ICreate;
}): Promise<ICommunityHubCommunityBan> {
  const community =
    await MyGlobal.prisma.community_hub_communities.findFirstOrThrow({
      where: { name: props.communityName, deleted_at: null },
      select: { id: true },
    });
  const moderatorRole =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember =
    await MyGlobal.prisma.community_hub_members.findFirstOrThrow({
      where: { username: props.body.username, deleted_at: null },
      select: { id: true },
    });
  const existingBan =
    await MyGlobal.prisma.community_hub_community_bans.findFirst({
      where: {
        community_hub_member_id: targetMember.id,
        community_hub_community_id: community.id,
        unbanned_at: null,
      },
      ...CommunityHubCommunityBanTransformer.select(),
    });
  if (existingBan) {
    return await CommunityHubCommunityBanTransformer.transform(existingBan);
  }
  const record = await MyGlobal.prisma.community_hub_community_bans.create({
    data: await CommunityHubCommunityBanCollector.collect({
      body: props.body,
      communityHubCommunities: { id: community.id },
      communityHubMembers: { id: props.member.id },
    }),
    ...CommunityHubCommunityBanTransformer.select(),
  });
  return await CommunityHubCommunityBanTransformer.transform(record);
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
// import { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubMemberCommunitiesCommunityNameBans(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: ICommunityHubCommunityBan.ICreate;
// }): Promise<ICommunityHubCommunityBan> {
//   const record = await MyGlobal.prisma.community_hub_community_bans.create({
//     data: await CommunityHubCommunityBanCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityHubCommunityBanTransformer.select(),
//   });
//   return await CommunityHubCommunityBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------