import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchRedditCommunityRegisteredUserRedditCommunityPosts(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const pageNumber = props.body.pageNumber > 0 ? props.body.pageNumber : 1;
  const pageSize = props.body.pageSize > 0 ? props.body.pageSize : 10;
  const skip = (pageNumber - 1) * pageSize;

  const whereCondition = {
    deleted_at: null,
    ...(props.body.postType ? { type: props.body.postType } : {}),
    ...(props.body.communityId
      ? { reddit_community_community_id: props.body.communityId }
      : {}),
    ...(props.body.authorId
      ? { reddit_community_registereduser_id: props.body.authorId }
      : {}),
    ...(props.body.searchKeyword
      ? {
          OR: [
            { title: { contains: props.body.searchKeyword } },
            { body: { contains: props.body.searchKeyword } },
          ],
        }
      : {}),
  };

  const orderBy =
    props.body.sortBy === "popularity"
      ? { created_at: "desc" as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };

  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereCondition,
      skip,
      take: pageSize,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where: whereCondition }),
  ]);

  // Extract unique registereduser and community ids
  const registeredUserIds = [
    ...new Set(posts.map((p) => p.reddit_community_registereduser_id)),
  ];
  const communityIds = [
    ...new Set(posts.map((p) => p.reddit_community_community_id)),
  ];

  // Fetch related registered users
  const registeredUsers =
    await MyGlobal.prisma.reddit_community_registeredusers.findMany({
      where: { id: { in: registeredUserIds } },
    });
  const registeredUserMap = new Map(registeredUsers.map((u) => [u.id, u]));

  // Fetch related communities
  const communities =
    await MyGlobal.prisma.reddit_community_communities.findMany({
      where: { id: { in: communityIds } },
    });
  const communityMap = new Map(communities.map((c) => [c.id, c]));

  return {
    pagination: {
      current: pageNumber satisfies number as number,
      limit: pageSize satisfies number as number,
      records: total,
      pages: Math.ceil(total / pageSize) satisfies number as number,
    },
    data: posts.map((post) => {
      const ru = registeredUserMap.get(post.reddit_community_registereduser_id);
      const com = communityMap.get(post.reddit_community_community_id);

      return {
        id: post.id,
        type: post.type,
        title: post.title,
        reddit_community_registereduser: ru
          ? {
              id: ru.id,
              email: ru.email,
              created_at: toISOStringSafe(ru.created_at),
              updated_at: toISOStringSafe(ru.updated_at),
              deleted_at: ru.deleted_at ? toISOStringSafe(ru.deleted_at) : null,
            }
          : {
              id: "" as string & tags.Format<"uuid">,
              email: "",
              created_at: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              updated_at: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              deleted_at: null,
            },
        reddit_community_community: com
          ? {
              id: com.id,
              name: com.name,
              title: com.title,
              description: com.description ?? null,
              creator_id: com.creator_id,
              created_at: toISOStringSafe(com.created_at),
              updated_at: toISOStringSafe(com.updated_at),
              deleted_at: com.deleted_at
                ? toISOStringSafe(com.deleted_at)
                : null,
            }
          : {
              id: "" as string & tags.Format<"uuid">,
              name: "",
              title: "",
              description: null,
              creator_id: "" as string & tags.Format<"uuid">,
              created_at: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              updated_at: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              deleted_at: null,
            },
        created_at: toISOStringSafe(post.created_at),
        updated_at: toISOStringSafe(post.updated_at),
      };
    }),
  };
}
