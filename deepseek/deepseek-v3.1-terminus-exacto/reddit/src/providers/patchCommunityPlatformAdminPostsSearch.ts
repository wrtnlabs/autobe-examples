import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsSearch(props: {
  admin: AdminPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.post_type && { post_type: props.body.post_type }),
    ...(props.body.search && {
      title: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.community_platform_postsWhereInput;
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          karma: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma: true,
              created_at: true,
            },
          },
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (post) =>
        ({
          id: post.id as string & tags.Format<"uuid">,
          title: post.title,
          post_type: post.post_type,
          author: {
            id: post.user.id as string & tags.Format<"uuid">,
            username: post.user.username,
            display_name: post.user.display_name,
            avatar_url: post.user.avatar_url as
              | (string & tags.Format<"uri">)
              | null,
            karma: post.user.karma,
            created_at: post.user.created_at.toISOString() as string &
              tags.Format<"date-time">,
          } satisfies ICommunityPlatformUser.ISummary,
          community: {
            id: post.community.id as string & tags.Format<"uuid">,
            name: post.community.name,
            description: post.community.description,
            icon_url: post.community.icon_url as
              | (string & tags.Format<"uri">)
              | null,
            owner: {
              id: post.community.owner.id as string & tags.Format<"uuid">,
              username: post.community.owner.username,
              display_name: post.community.owner.display_name,
              avatar_url: post.community.owner.avatar_url as
                | (string & tags.Format<"uri">)
                | null,
              karma: post.community.owner.karma,
              created_at:
                post.community.owner.created_at.toISOString() as string &
                  tags.Format<"date-time">,
            } satisfies ICommunityPlatformUser.ISummary,
            created_at: post.community.created_at.toISOString() as string &
              tags.Format<"date-time">,
          } satisfies ICommunityPlatformCommunity.ISummary,
          created_at: post.created_at.toISOString() as string &
            tags.Format<"date-time">,
        }) satisfies ICommunityPlatformPost.ISummary,
    ),
  };
}
