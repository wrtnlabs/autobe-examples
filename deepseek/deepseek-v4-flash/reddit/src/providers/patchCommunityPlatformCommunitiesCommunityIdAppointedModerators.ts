import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityIdAppointedModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  // 1. Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const cursor = props.body.cursor;
  // 2. Build WHERE clause
  const where: Prisma.community_platform_community_moderatorsWhereInput = {
    community_platform_community_id: props.communityId,
  };
  // 3. Search filter: partial match on member username
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    where.member = {
      username: {
        contains: props.body.search.trim(),
        mode: "insensitive",
      },
    };
  }
  // 4. Build orderBy based on sort parameter
  // Requires id as tiebreaker for deterministic cursor-based pagination
  const orderBy: Prisma.community_platform_community_moderatorsOrderByWithRelationInput[] =
    props.body.sort === "member"
      ? [{ member: { username: "asc" } }, { id: "asc" }]
      : [{ created_at: "desc" }, { id: "asc" }];
  // 5. Fetch records with pagination
  let rawRecords: CommunityPlatformCommunityModeratorAtSummaryTransformer.Payload[];
  if (cursor !== undefined) {
    // Cursor-based pagination
    let cursorId: string | undefined;
    try {
      const decodedCursor: {
        id: string;
      } = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
      cursorId = decodedCursor.id;
    } catch {
      // Invalid or malformed cursor — start from the beginning
      cursorId = undefined;
    }
    if (cursorId !== undefined) {
      rawRecords =
        await MyGlobal.prisma.community_platform_community_moderators.findMany({
          where,
          orderBy,
          cursor: { id: cursorId },
          skip: 1,
          take: limit + 1,
          ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
        });
    } else {
      rawRecords =
        await MyGlobal.prisma.community_platform_community_moderators.findMany({
          where,
          orderBy,
          take: limit + 1,
          ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
        });
    }
  } else {
    // Offset-based pagination using page number
    const skip = (page - 1) * limit;
    rawRecords =
      await MyGlobal.prisma.community_platform_community_moderators.findMany({
        where,
        orderBy,
        skip,
        take: limit + 1,
        ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
      });
  }
  // 6. Count total matching records for pagination metadata
  const total =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where,
    });
  // 7. Determine if there are more records beyond this page
  const hasMore = rawRecords.length > limit;
  const records = hasMore ? rawRecords.slice(0, limit) : rawRecords;
  // 8. Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformCommunityModeratorAtSummaryTransformer.transform,
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
// import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
// import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformCommunitiesCommunityIdAppointedModerators(props: {
//   communityId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommunityModerator.IRequest;
// }): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_community_moderators.findMany({
//     ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformCommunityModeratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------