import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const { communityId, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Initialize as empty object to avoid spread of undefined
  let createdAtFilter: {
    gte?: (string & tags.Format<"date-time">) | undefined;
    lte?: (string & tags.Format<"date-time">) | undefined;
  } = {};

  if (body.created_after !== undefined && body.created_after !== null) {
    createdAtFilter.gte = body.created_after;
  }
  if (body.created_before !== undefined && body.created_before !== null) {
    createdAtFilter.lte = body.created_before;
  }

  // If both gte and lte keys are missing, set to undefined
  const createdAtFilterFinal =
    Object.keys(createdAtFilter).length > 0 ? createdAtFilter : undefined;

  const where: Prisma.reddit_community_postsWhereInput = {
    reddit_community_community_id: communityId,
    deleted_at: null,
    ...(body.post_type !== undefined &&
      body.post_type !== null && {
        post_type: body.post_type,
      }),
    ...(createdAtFilterFinal !== undefined && {
      created_at: createdAtFilterFinal,
    }),
  };

  const sortOptions = new Set(["hot", "new", "top", "controversial"]);
  const orderBy = sortOptions.has(body.sort ?? "new")
    ? { created_at: "desc" as const }
    : { created_at: "desc" as const };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        reddit_community_community_id: true,
        post_type: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        status: true,
        business_status: true,
      },
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where }),
  ]);

  return {
    pagination: {
      current: page & 0xffffffff,
      limit: limit & 0xffffffff,
      records: total & 0xffffffff,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      reddit_community_community_id: item.reddit_community_community_id,
      post_type: item.post_type,
      title: item.title,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      status: item.status ?? null,
      business_status: item.business_status ?? null,
    })),
  };
}
