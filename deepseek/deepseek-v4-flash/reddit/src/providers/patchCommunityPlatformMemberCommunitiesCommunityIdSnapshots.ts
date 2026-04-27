import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunitySnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommunitySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdSnapshots(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const sort: string = props.body.sort ?? "-created_at";
  const orderBy: Prisma.community_platform_community_snapshotsOrderByWithRelationInput =
    sort === "created_at" ? { created_at: "asc" } : { created_at: "desc" };
  const where: Prisma.community_platform_community_snapshotsWhereInput = {
    community_platform_community_id: props.communityId,
  };
  if (props.body.created_at !== undefined) {
    const gte: string | null | undefined = props.body.created_at.gte;
    const lte: string | null | undefined = props.body.created_at.lte;
    const gteFilter: string | undefined =
      gte !== undefined && gte !== null ? gte : undefined;
    const lteFilter: string | undefined =
      lte !== undefined && lte !== null ? lte : undefined;
    if (gteFilter !== undefined || lteFilter !== undefined) {
      where.created_at = {
        ...(gteFilter !== undefined ? { gte: gteFilter } : {}),
        ...(lteFilter !== undefined ? { lte: lteFilter } : {}),
      };
    }
  }
  const records =
    await MyGlobal.prisma.community_platform_community_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...CommunityPlatformCommunitySnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_community_snapshots.count({
      where,
    });
  const pages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformCommunitySnapshotAtSummaryTransformer.transform,
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
// import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
// import { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberCommunitiesCommunityIdSnapshots(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommunitySnapshot.IRequest;
// }): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_community_snapshots.findMany({
//     ...CommunityPlatformCommunitySnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformCommunitySnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------