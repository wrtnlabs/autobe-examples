import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneModeratorSnapshotAtSummaryTransformer } from "../transformers/RedditCloneModeratorSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCloneModeratorSnapshot.IRequest;
}): Promise<IPageIRedditCloneModeratorSnapshot.ISummary> {
  // Authorization: Verify requesting member has moderator authority in the community
  const requestingModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  if (requestingModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with conditional filters
  const whereInput = {
    reddit_clone_community_id: props.communityId,
    reddit_clone_moderator_id: props.moderatorId,
    ...(props.body.createdAtRange !== undefined && {
      created_at: {
        ...(props.body.createdAtRange.from !== undefined && {
          gte: new Date(props.body.createdAtRange.from),
        }),
        ...(props.body.createdAtRange.to !== undefined && {
          lte: new Date(props.body.createdAtRange.to),
        }),
      },
    }),
    ...(props.body.assignedAtRange !== undefined && {
      assigned_at: {
        ...(props.body.assignedAtRange.from !== undefined && {
          gte: new Date(props.body.assignedAtRange.from),
        }),
        ...(props.body.assignedAtRange.to !== undefined && {
          lte: new Date(props.body.assignedAtRange.to),
        }),
      },
    }),
    ...(props.body.role !== undefined && { role: props.body.role }),
  } satisfies Prisma.reddit_clone_moderator_snapshotsWhereInput;
  // Query snapshots with transformer select
  const records =
    await MyGlobal.prisma.reddit_clone_moderator_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditCloneModeratorSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_clone_moderator_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneModeratorSnapshotAtSummaryTransformer.transform,
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
// import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
// import { IPageIRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   moderatorId: string & tags.Format<"uuid">;
//   body: IRedditCloneModeratorSnapshot.IRequest;
// }): Promise<IPageIRedditCloneModeratorSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_moderator_snapshots.findMany({
//     ...RedditCloneModeratorSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneModeratorSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------