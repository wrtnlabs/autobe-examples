import { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubCommunityBanAtSummaryTransformer } from "../transformers/CommunityHubCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityHubCommunityBan.IRequest;
}): Promise<IPageICommunityHubCommunityBan.ISummary> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true, member_id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const isOwner = community.member_id === props.member.id;
  if (!isOwner) {
    const moderatorRole =
      await MyGlobal.prisma.community_hub_community_moderators.findFirst({
        where: {
          community_hub_community_id: community.id,
          community_hub_member_id: props.member.id,
        },
      });
    if (moderatorRole === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_hub_community_bansWhereInput = {
    community_hub_community_id: community.id,
    deleted_at: null,
  };
  if (props.body.status === "active") {
    whereInput.unbanned_at = null;
  } else if (props.body.status === "lifted") {
    whereInput.unbanned_at = { not: null };
  }
  if (props.body.issued_by_id !== undefined) {
    whereInput.issued_by_id = props.body.issued_by_id;
  }
  if (props.body.date_from !== undefined || props.body.date_to !== undefined) {
    whereInput.created_at = {
      ...(props.body.date_from !== undefined && { gte: props.body.date_from }),
      ...(props.body.date_to !== undefined && { lte: props.body.date_to }),
    };
  }
  if (props.body.search !== undefined) {
    whereInput.bannedMember = {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        {
          display_name: { contains: props.body.search, mode: "insensitive" },
        },
      ],
    };
  }
  const orderByInput: Prisma.community_hub_community_bansOrderByWithRelationInput =
    props.body.sort === "created_at"
      ? { created_at: "asc" }
      : props.body.sort === "status"
        ? {
            unbanned_at: {
              sort: "asc",
              nulls: "first",
            },
          }
        : props.body.sort === "banned_user"
          ? {
              bannedMember: {
                display_name: "asc",
              },
            }
          : { created_at: "desc" };
  const records = await MyGlobal.prisma.community_hub_community_bans.findMany({
    where: whereInput,
    ...CommunityHubCommunityBanAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.community_hub_community_bans.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityHubCommunityBanAtSummaryTransformer.transform,
    ),
  };
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
// import { IPageICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityBan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubMemberCommunitiesCommunityNameBans(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: ICommunityHubCommunityBan.IRequest;
// }): Promise<IPageICommunityHubCommunityBan.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_community_bans.findMany({
//     ...CommunityHubCommunityBanAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubCommunityBanAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------