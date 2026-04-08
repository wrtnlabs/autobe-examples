import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileAtSummaryTransformer } from "../transformers/RedditCloneFileAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "../transformers/RedditCloneMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneProfiles(props: {
  body: IRedditCloneUserProfile.IRequest;
}): Promise<IPageIRedditCloneUserProfile.ISummary> {
  const { search, page, limit, sort, order, created_after, created_before } =
    props.body;
  const currentPage = page ?? 1;
  const pageLimit = limit ?? 20;
  const skip = (currentPage - 1) * pageLimit;
  const where = {
    ...(search && {
      display_name: { contains: search, mode: "insensitive" as const },
    }),
    ...(created_after && { created_at: { gte: new Date(created_after) } }),
    ...(created_before && { created_at: { lte: new Date(created_before) } }),
  } satisfies Prisma.reddit_clone_user_profilesWhereInput;
  const orderByInput = (
    sort === "display_name"
      ? { display_name: order ?? "desc" }
      : { created_at: order ?? "desc" }
  ) satisfies Prisma.reddit_clone_user_profilesOrderByWithRelationInput;
  const profiles = await MyGlobal.prisma.reddit_clone_user_profiles.findMany({
    where,
    orderBy: orderByInput,
    skip,
    take: pageLimit,
    select: {
      id: true,
      display_name: true,
      bio: true,
      created_at: true,
      reddit_clone_member_id: true,
      avatarFileAssociation: {
        select: {
          file: RedditCloneFileAtSummaryTransformer.select(),
        },
      } satisfies Prisma.reddit_clone_file_associationsFindManyArgs,
      member: RedditCloneMemberAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_user_profiles.count({
    where,
  });
  const memberIds = profiles.map((p) => p.reddit_clone_member_id);
  const karmaRecords = await MyGlobal.prisma.reddit_clone_user_karmas.findMany({
    where: { reddit_clone_member_id: { in: memberIds } },
    select: { reddit_clone_member_id: true, karma_score: true },
  });
  const karmaMap = new Map(
    karmaRecords.map((k) => [k.reddit_clone_member_id, k.karma_score]),
  );
  const data = await ArrayUtil.asyncMap(profiles, async (profile) => ({
    id: profile.id as string & tags.Format<"uuid">,
    displayName: profile.display_name,
    bio: profile.bio ?? undefined,
    createdAt: profile.created_at.toISOString() as string &
      tags.Format<"date-time">,
    avatar: profile.avatarFileAssociation?.file
      ? await RedditCloneFileAtSummaryTransformer.transform(
          profile.avatarFileAssociation.file,
        )
      : undefined,
    member: await RedditCloneMemberAtSummaryTransformer.transform(
      profile.member,
    ),
    karmaScore: karmaMap.get(profile.reddit_clone_member_id) ?? 0,
  }));
  return {
    pagination: {
      current: currentPage,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    } satisfies IPage.IPagination,
    data,
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
// import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
// import { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneProfiles(props: {
//   body: IRedditCloneUserProfile.IRequest;
// }): Promise<IPageIRedditCloneUserProfile.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_user_profiles.findMany({
//     ...RedditCloneUserProfileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneUserProfileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------