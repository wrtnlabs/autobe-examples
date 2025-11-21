import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComment";
import { IPageICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityBBSPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityBBSComment.IRequest;
}): Promise<IPageICommunityBBSComment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_comments.findMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
        body: props.body ? { contains: props.body } : undefined,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        body: true,
      },
    }),
    MyGlobal.prisma.community_bbs_comments.count({
      where: {
        post_id: props.postId,
        deleted_at: null,
        body: props.body ? { contains: props.body } : undefined,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((comment) => comment.body),
  };
}
