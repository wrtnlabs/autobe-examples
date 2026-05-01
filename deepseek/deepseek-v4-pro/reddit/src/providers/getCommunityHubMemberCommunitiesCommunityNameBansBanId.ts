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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubCommunityBanTransformer } from "../transformers/CommunityHubCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityHubMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubCommunityBan> {
  const community =
    await MyGlobal.prisma.community_hub_communities.findFirstOrThrow({
      where: {
        name: {
          equals: props.communityName,
          mode: "insensitive",
        },
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
      },
    });
  const isOwner = community.member_id === props.member.id;
  if (!isOwner) {
    const moderatorRecord =
      await MyGlobal.prisma.community_hub_community_moderators.findFirst({
        where: {
          community_hub_community_id: community.id,
          community_hub_member_id: props.member.id,
        },
      });
    if (!moderatorRecord) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const ban =
    await MyGlobal.prisma.community_hub_community_bans.findFirstOrThrow({
      where: {
        id: props.banId,
        community_hub_community_id: community.id,
        deleted_at: null,
      },
      ...CommunityHubCommunityBanTransformer.select(),
    });
  return await CommunityHubCommunityBanTransformer.transform(ban);
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
// export async function getCommunityHubMemberCommunitiesCommunityNameBansBanId(props: {
//   member: MemberPayload;
//   communityName: string;
//   banId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubCommunityBan> {
//   const record = await MyGlobal.prisma.community_hub_community_bans.findFirstOrThrow({
//     ...CommunityHubCommunityBanTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubCommunityBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------