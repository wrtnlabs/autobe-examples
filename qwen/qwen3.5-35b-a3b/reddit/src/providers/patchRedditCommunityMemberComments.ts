import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberComments(props: {
  member: MemberPayload;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * validatedLimit;
  const whereInput: Prisma.reddit_community_commentsWhereInput = {
    deleted_at: null,
    ...(props.body.authorId && {
      reddit_community_members_id: props.body.authorId,
    }),
    ...(props.body.postId && {
      reddit_community_posts_id: props.body.postId,
    }),
    ...(props.body.communityId && {
      post: {
        community_id: props.body.communityId,
      },
    }),
    ...(props.body.afterDate && {
      created_at: {
        gt: new Date(props.body.afterDate),
      },
    }),
    ...(props.body.beforeDate && {
      created_at: {
        lt: new Date(props.body.beforeDate),
      },
    }),
    ...(props.body.voteScoreMin !== undefined && {
      votes: {
        some: {
          vote_type: "up",
        },
      },
    }),
    ...(props.body.voteScoreMax !== undefined && {
      votes: {
        some: {
          vote_type: "down",
        },
      },
    }),
  } satisfies Prisma.reddit_community_commentsWhereInput;
  const orderByInput = (() => {
    const sort = props.body.sort ?? "best";
    if (sort === "new") {
      return {
        created_at: "desc" as const,
      } satisfies Prisma.reddit_community_commentsOrderByWithRelationInput;
    } else if (sort === "controversial") {
      return {
        votes: { _count: "desc" as const },
        created_at: "desc" as const,
      } satisfies Prisma.reddit_community_commentsOrderByWithRelationInput;
    } else {
      return {
        votes: { _count: "desc" as const },
        created_at: "desc" as const,
      } satisfies Prisma.reddit_community_commentsOrderByWithRelationInput;
    }
  })();
  const data = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereInput,
    skip,
    take: validatedLimit,
    orderBy: orderByInput,
    ...RedditCommunityCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereInput,
  });
  return {
    data: await RedditCommunityCommentAtSummaryTransformer.transformAll(data),
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
  };
}
