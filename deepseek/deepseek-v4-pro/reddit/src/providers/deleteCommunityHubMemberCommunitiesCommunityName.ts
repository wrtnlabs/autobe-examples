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

export async function deleteCommunityHubMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" },
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    return;
  }
  if (community.member_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can delete the community",
      403,
    );
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_hub_communities.update({
      where: { id: community.id },
      data: {
        deleted_at: now,
        subscriber_count: 0,
      },
    }),
    MyGlobal.prisma.community_hub_posts.updateMany({
      where: {
        community_hub_community_id: community.id,
        deleted_at: null,
      },
      data: { deleted_at: now },
    }),
    MyGlobal.prisma.community_hub_comments.updateMany({
      where: {
        post: {
          community_hub_community_id: community.id,
        },
        deleted_at: null,
      },
      data: { deleted_at: now },
    }),
    MyGlobal.prisma.community_hub_community_subscriptions.deleteMany({
      where: { community_id: community.id },
    }),
    MyGlobal.prisma.community_hub_community_bans.deleteMany({
      where: { community_hub_community_id: community.id },
    }),
    MyGlobal.prisma.community_hub_community_moderators.deleteMany({
      where: { community_hub_community_id: community.id },
    }),
    MyGlobal.prisma.community_hub_reports.updateMany({
      where: {
        community_hub_community_id: community.id,
        deleted_at: null,
      },
      data: { deleted_at: now },
    }),
  ]);
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
// export async function deleteCommunityHubMemberCommunitiesCommunityName(props: {
//   member: MemberPayload;
//   communityName: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------