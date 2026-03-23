import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorCommunitiesCommunityIdReports(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Verify moderator has role in target community
  const role =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirstOrThrow({
      where: {
        user_id: props.moderator.id,
        community_id: props.communityId,
      },
      select: { id: true, role: true },
    });
  const status = props.body.status;
  const data = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: {
      deleted_at: null,
      ...(status !== null ? { status } : {}),
      OR: [
        {
          reportedPost: {
            community_id: props.communityId,
            deleted_at: null,
          },
        },
        {
          reportedComment: {
            post: {
              community_id: props.communityId,
              deleted_at: null,
            },
          },
        },
      ],
    },
    skip,
    take: limit,
    orderBy: {
      created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    },
    ...RedditLikeReportTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: {
      deleted_at: null,
      ...(status !== null ? { status } : {}),
      OR: [
        {
          reportedPost: {
            community_id: props.communityId,
            deleted_at: null,
          },
        },
        {
          reportedComment: {
            post: {
              community_id: props.communityId,
              deleted_at: null,
            },
          },
        },
      ],
    },
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditLikeReportTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
