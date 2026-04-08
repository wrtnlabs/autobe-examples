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
  const requesterModerator =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (!requesterModerator) {
    throw new HttpException(
      "You do not have moderator authority in this community",
      403,
    );
  }
  // Validate: Verify moderatorId exists and belongs to the community
  const targetModerator =
    await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        id: props.moderatorId,
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!targetModerator) {
    throw new HttpException("Moderator not found in this community", 404);
  }
  // Build date range filter for created_at
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdAtRange?.from !== undefined) {
    createdAtFilter.gte = new Date(props.body.createdAtRange.from);
  }
  if (props.body.createdAtRange?.to !== undefined) {
    createdAtFilter.lte = new Date(props.body.createdAtRange.to);
  }
  // Build date range filter for assigned_at
  const assignedAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.assignedAtRange?.from !== undefined) {
    assignedAtFilter.gte = new Date(props.body.assignedAtRange.from);
  }
  if (props.body.assignedAtRange?.to !== undefined) {
    assignedAtFilter.lte = new Date(props.body.assignedAtRange.to);
  }
  // Pagination parameters
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_clone_moderator_snapshotsWhereInput = {
    reddit_clone_moderator_id: props.moderatorId,
    reddit_clone_community_id: props.communityId,
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(Object.keys(assignedAtFilter).length > 0 && {
      assigned_at: assignedAtFilter,
    }),
  };
  // Query snapshots with pagination
  const records =
    await MyGlobal.prisma.reddit_clone_moderator_snapshots.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditCloneModeratorSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const totalRecords: number =
    await MyGlobal.prisma.reddit_clone_moderator_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneModeratorSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCloneModeratorSnapshot.ISummary;
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