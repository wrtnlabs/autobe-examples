import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";

export async function patchCommunityPlatformPostsPostIdCommentsSort(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const limit = props.body.limit ?? 20;
  const skip = props.body.offset ?? 0;
  // Determine sort order
  let orderBy: Prisma.community_platform_commentsOrderByWithRelationInput;
  if (props.body.sort === "best") {
    orderBy = {
      votes: {
        _count: "desc",
      },
      created_at: "asc",
    };
  } else if (props.body.sort === "new") {
    orderBy = {
      created_at: "desc",
    };
  } else if (props.body.sort === "controversial") {
    orderBy = {
      votes: {
        _count: "desc",
      },
    };
  } else {
    orderBy = {
      votes: {
        _count: "desc",
      },
      created_at: "asc",
    };
  }
  // Query with selected fields and conditions
  const data = await MyGlobal.prisma.community_platform_comments.findMany({
    where: {
      post_id: props.postId, // Fixed: Use actual relation field name 'post_id' from schema, not 'post'
      ...(props.body.sort === "controversial" && {
        votes: {
          some: {},
        },
      }),
    },
    orderBy,
    skip,
    take: limit,
    ...CommunityPlatformCommentAtSummaryTransformer.select(), // Already includes _count structure - transformer requires this
  });
  // Count total matching records - must use same where conditions for consistency
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: {
      post_id: props.postId, // Fixed: Use actual relation field name 'post_id' from schema, not 'post'
      ...(props.body.sort === "controversial" && {
        votes: {
          some: {},
        },
      }),
    },
  });
  // Transform data using existing transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: Math.floor(skip / limit) + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
