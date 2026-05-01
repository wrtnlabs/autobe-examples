import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
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
import { CommunityHubCommunityTransformer } from "../transformers/CommunityHubCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityHubMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityHubCommunity.IUpdate;
}): Promise<ICommunityHubCommunity> {
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
  if (community.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_hub_communities.update({
    where: { id: community.id },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_image !== undefined && {
        icon_image: props.body.icon_image,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.community_hub_communities.findUniqueOrThrow({
      where: { id: community.id },
      ...CommunityHubCommunityTransformer.select(),
    });
  return await CommunityHubCommunityTransformer.transform(updated);
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
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityHubMemberCommunitiesCommunityName(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: ICommunityHubCommunity.IUpdate;
// }): Promise<ICommunityHubCommunity> {
//   await MyGlobal.prisma.community_hub_communities.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_hub_communities.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityHubCommunityTransformer.select(),
//   });
//   return await CommunityHubCommunityTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------