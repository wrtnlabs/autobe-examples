import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityHubMemberCommunitiesCommunityNameSubscriptions(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: {
        equals: props.communityName,
        mode: "insensitive",
      },
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const subscription =
    await MyGlobal.prisma.community_hub_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
      },
      select: {
        id: true,
      },
    });
  if (subscription === null) {
    return;
  }
  await MyGlobal.prisma.community_hub_community_subscriptions.delete({
    where: { id: subscription.id },
  });
  await MyGlobal.prisma.community_hub_communities.update({
    where: { id: community.id },
    data: {
      subscriber_count: {
        decrement: 1,
      },
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteCommunityHubMemberCommunitiesCommunityNameSubscriptions(props: {
//   member: MemberPayload;
//   communityName: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------