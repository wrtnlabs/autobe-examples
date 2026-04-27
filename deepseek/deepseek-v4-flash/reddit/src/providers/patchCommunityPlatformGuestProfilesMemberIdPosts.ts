import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

function epochToISOString(epoch: number): string {
  // Convert epoch milliseconds (UTC) to ISO 8601 string without using Date constructor.
  // Based on Howard Hinnant's algorithms for date conversion.
  const totalDays: number = Math.floor(epoch / 86400000);
  const timeInDay: number = ((epoch % 86400000) + 86400000) % 86400000;
  // Civil date from days since 1970-01-01 (Rata Die algorithm)
  const z: number = totalDays + 719468;
  const era: number = Math.floor(z >= 0 ? z : z - 146096) / 146097;
  const doe: number = z - era * 146097;
  const yoe: number = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  );
  const y: number = yoe + era * 400;
  const doy: number =
    doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp: number = Math.floor((5 * doy + 2) / 153);
  const d: number = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m: number = mp < 10 ? mp + 3 : mp - 9;
  const year: number = y + (m <= 2 ? 1 : 0);
  const hours: number = Math.floor(timeInDay / 3600000);
  const minutes: number = Math.floor((timeInDay % 3600000) / 60000);
  const seconds: number = Math.floor((timeInDay % 60000) / 1000);
  const ms: number = timeInDay % 1000;
  const pad = (n: number, digits: number): string =>
    String(n).padStart(digits, "0");
  return `${pad(year, 4)}-${pad(m, 2)}-${pad(d, 2)}T${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(ms, 3)}Z`;
}
// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformGuestProfilesMemberIdPosts(props: {
  guest: GuestPayload;
  memberId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Pagination parameters
  const page: number = Math.max(1, props.body.page ?? 1);
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const sort: string = props.body.sort ?? "hot";
  // Build WHERE clause — filter by member (author) and active (non-deleted)
  const where: Prisma.community_platform_postsWhereInput = {
    member_id: props.memberId,
    deleted_at: null,
  };
  // Optional community scope filter
  if (props.body.communityId !== undefined) {
    where.community_id = props.body.communityId;
  }
  // Optional title search (case-insensitive substring match)
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    where.title = {
      contains: props.body.search.trim(),
      mode: "insensitive",
    };
  }
  // Timeframe window for 'top' sort mode
  if (
    sort === "top" &&
    props.body.timeframe !== undefined &&
    props.body.timeframe !== "all"
  ) {
    const nowEpoch: number = Date.now();
    const timeframeStartEpoch: number = (() => {
      switch (props.body.timeframe) {
        case "hour":
          return nowEpoch - 60 * 60 * 1000;
        case "today":
          return nowEpoch - (nowEpoch % 86400000);
        case "week":
          return nowEpoch - 7 * 24 * 60 * 60 * 1000;
        case "month":
          return nowEpoch - 30 * 24 * 60 * 60 * 1000;
        case "year":
          return nowEpoch - 365 * 24 * 60 * 60 * 1000;
      }
    })();
    where.created_at = {
      gte: epochToISOString(timeframeStartEpoch),
    };
  }
  // Count total matching records
  const total: number = await MyGlobal.prisma.community_platform_posts.count({
    where,
  });
  let records: CommunityPlatformPostAtSummaryTransformer.Payload[];
  if (sort === "hot" || sort === "controversial") {
    // Hot and Controversial require computed scores — fetch all matching,
    // sort in memory, then paginate. A single member's post count is bounded.
    const allRecords = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
      orderBy: { created_at: "desc" },
    });
    if (sort === "hot") {
      const nowEpoch: number = Date.now();
      allRecords.sort((a, b) => {
        const hoursA: number = (nowEpoch - a.created_at.getTime()) / 3600000;
        const hoursB: number = (nowEpoch - b.created_at.getTime()) / 3600000;
        const scoreA: number = a.vote_score / Math.pow(hoursA + 2, 1.5);
        const scoreB: number = b.vote_score / Math.pow(hoursB + 2, 1.5);
        return scoreB - scoreA;
      });
    } else {
      // Controversial: higher total engagement with net score near zero
      // means more divisive content. Sort by |net_score|/engagement ascending
      // so items nearest zero (highest controversy) come first.
      allRecords.sort((a, b) => {
        const engagementA: number = a.comment_count + Math.abs(a.vote_score);
        const engagementB: number = b.comment_count + Math.abs(b.vote_score);
        if (engagementA === 0 && engagementB === 0) return 0;
        if (engagementA === 0) return 1;
        if (engagementB === 0) return -1;
        const controversyA: number = Math.abs(a.vote_score) / engagementA;
        const controversyB: number = Math.abs(b.vote_score) / engagementB;
        return controversyA - controversyB;
      });
    }
    records = allRecords.slice(skip, skip + limit);
  } else {
    // 'new' and 'top' use Prisma-native ordering
    const orderBy: Prisma.community_platform_postsOrderByWithRelationInput =
      sort === "new" ? { created_at: "desc" } : { vote_score: "desc" };
    records = await MyGlobal.prisma.community_platform_posts.findMany({
      where,
      ...CommunityPlatformPostAtSummaryTransformer.select(),
      orderBy,
      skip,
      take: limit,
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformPostAtSummaryTransformer.transform,
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
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformGuestProfilesMemberIdPosts(props: {
//   guest: GuestPayload;
//   memberId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformPost.IRequest;
// }): Promise<IPageICommunityPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_posts.findMany({
//     ...CommunityPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------