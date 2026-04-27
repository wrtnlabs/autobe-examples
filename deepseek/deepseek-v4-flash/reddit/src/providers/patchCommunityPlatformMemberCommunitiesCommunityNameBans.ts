import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanAtSummaryTransformer } from "../transformers/CommunityPlatformBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan.ISummary> {
  // 1. Resolve community by canonical name (unique field)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  // 2. Authorization: only owner or moderator can view banned users list
  // Per Section 208: non-moderator viewing banned list is rejected
  const moderation =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
        role: { in: ["owner", "moderator"] },
      },
    });
  if (moderation === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Build WHERE clause with optional filters
  const where = {
    community_platform_community_id: community.id,
    ...(props.body.bannedMemberUsername !== undefined
      ? {
          bannedMember: {
            username: {
              contains: props.body.bannedMemberUsername,
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
    ...(props.body.bannedByUsername !== undefined
      ? {
          bannedBy: {
            username: {
              contains: props.body.bannedByUsername,
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
    ...(props.body.fromDate !== undefined || props.body.toDate !== undefined
      ? {
          created_at: {
            ...(props.body.fromDate !== undefined
              ? { gte: new Date(props.body.fromDate) }
              : {}),
            ...(props.body.toDate !== undefined
              ? { lte: new Date(props.body.toDate) }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_bansWhereInput;
  // 5. Execute findMany first, then count sequentially
  const records = await MyGlobal.prisma.community_platform_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_bans.count({ where });
  // 6. Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformBanAtSummaryTransformer.transform,
    ),
  } satisfies IPageICommunityPlatformBan.ISummary;
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
// import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberCommunitiesCommunityNameBans(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: ICommunityPlatformBan.IRequest;
// }): Promise<IPageICommunityPlatformBan.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_bans.findMany({
//     ...CommunityPlatformBanAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformBanAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------