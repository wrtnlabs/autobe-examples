import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityImageAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityIdImages(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.IRequest;
}): Promise<IPageICommunityPlatformCommunityImage.ISummary> {
  const limit = Math.min(props.body.limit ?? 100, 100);
  const cursor = props.body.cursor;
  // Build dynamic where clause
  const where: Prisma.community_platform_community_imagesWhereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
  };
  if (props.body.search !== undefined) {
    where.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.mime_type !== undefined) {
    where.mime_type = props.body.mime_type;
  }
  if (props.body.size_from !== undefined || props.body.size_to !== undefined) {
    where.size = {};
    if (props.body.size_from !== undefined) {
      where.size.gte = props.body.size_from;
    }
    if (props.body.size_to !== undefined) {
      where.size.lte = props.body.size_to;
    }
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_from !== undefined) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  // Total count for pagination
  const total = await MyGlobal.prisma.community_platform_community_images.count(
    {
      where,
    },
  );
  // Execute query with pagination
  let records: CommunityPlatformCommunityImageAtSummaryTransformer.Payload[];
  if (cursor !== undefined) {
    // Cursor-based pagination: decode position from base64 cursor
    const decoded: {
      id: string;
      created_at: string;
    } = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
    where.OR = [
      { created_at: { lt: decoded.created_at } },
      {
        created_at: decoded.created_at,
        id: { lt: decoded.id },
      },
    ];
    records =
      await MyGlobal.prisma.community_platform_community_images.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: limit,
        ...CommunityPlatformCommunityImageAtSummaryTransformer.select(),
      });
  } else {
    // Page-based pagination fallback
    const page = props.body.page ?? 1;
    const skip = (page - 1) * limit;
    records =
      await MyGlobal.prisma.community_platform_community_images.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip,
        take: limit,
        ...CommunityPlatformCommunityImageAtSummaryTransformer.select(),
      });
  }
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: cursor !== undefined ? 1 : (props.body.page ?? 1),
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformCommunityImageAtSummaryTransformer.transform,
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
// import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
// import { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformCommunitiesCommunityIdImages(props: {
//   communityId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommunityImage.IRequest;
// }): Promise<IPageICommunityPlatformCommunityImage.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_community_images.findMany({
//     ...CommunityPlatformCommunityImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformCommunityImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------