import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestMembersMemberIdComments(props: {
  guest: GuestPayload;
  memberId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  // Validate member exists and is not soft-deleted
  await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  // Parse pagination parameters
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_member_id: props.memberId,
    deleted_at: null,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.reddit_community_commentsWhereInput;
  // Build orderBy based on sort parameter
  // Note: True vote_score ordering requires aggregation, using created_at as fallback
  const orderByInput: Prisma.reddit_community_commentsOrderByWithRelationInput =
    props.body.sort === "best"
      ? {
          created_at: "desc",
        }
      : props.body.sort === "controversial"
        ? {
            created_at: "desc",
          }
        : {
            created_at: "desc",
          };
  // Query comments with transformer select
  const data = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityCommentAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommentAtSummaryTransformer.transform,
  );
  // Apply in-memory sorting for 'best' and 'controversial' if needed
  const sorted = transformed;
  if (props.body.sort === "best") {
    sorted.sort((a, b) => {
      if (b.vote_score !== a.vote_score) {
        return b.vote_score - a.vote_score;
      }
      return b.created_at.localeCompare(a.created_at);
    });
  } else if (props.body.sort === "controversial") {
    sorted.sort((a, b) => {
      const aControversy = Math.abs(a.vote_score);
      const bControversy = Math.abs(b.vote_score);
      if (aControversy !== bControversy) {
        return aControversy - bControversy;
      }
      const aTotal = Math.abs(a.vote_score);
      const bTotal = Math.abs(b.vote_score);
      return bTotal - aTotal;
    });
  }
  return {
    data: sorted,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
