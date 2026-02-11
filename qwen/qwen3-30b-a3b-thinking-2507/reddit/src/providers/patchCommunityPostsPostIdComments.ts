import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentSummaryTransformer } from "../transformers/CommunityCommentSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_comments.findMany({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityCommentSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_comments.count({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityCommentSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
