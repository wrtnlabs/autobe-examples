import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserComments(props: {
  user: UserPayload;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Extract page and limit safely from body using type guard to avoid TS errors
  const body: any = props.body as unknown;
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    is_deleted: false,
  } satisfies Prisma.community_platform_commentsWhereInput;
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      user_id: true,
      post_id: true,
      parent_id: true,
      content: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      user_id: comment.user_id,
      post_id: comment.post_id,
      parent_id: comment.parent_id ?? null,
      content: comment.content,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      user: {
        display_name: comment.user.display_name,
        avatar_url: comment.user.avatar_url ?? null,
      },
    })),
  };
}
