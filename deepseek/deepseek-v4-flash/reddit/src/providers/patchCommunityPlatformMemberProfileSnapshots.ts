import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberProfileSnapshots(props: {
  member: MemberPayload;
  body: ICommunityPlatformProfileSnapshot.IRequest;
}): Promise<IPageICommunityPlatformProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_profile_snapshotsWhereInput = {
    ...(props.body.memberId !== undefined && {
      community_platform_member_id: props.body.memberId,
    }),
    ...(props.body.profileId !== undefined && {
      community_platform_profile_id: props.body.profileId,
    }),
    ...((props.body.from !== undefined || props.body.to !== undefined) && {
      created_at: {
        ...(props.body.from !== undefined && { gte: props.body.from }),
        ...(props.body.to !== undefined && { lt: props.body.to }),
      },
    }),
  };
  const total =
    await MyGlobal.prisma.community_platform_profile_snapshots.count({
      where,
    });
  const records =
    await MyGlobal.prisma.community_platform_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformProfileSnapshotAtSummaryTransformer.select(),
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
// import { IPageICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberProfileSnapshots(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformProfileSnapshot.IRequest;
// }): Promise<IPageICommunityPlatformProfileSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_profile_snapshots.findMany({
//     ...CommunityPlatformProfileSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformProfileSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------