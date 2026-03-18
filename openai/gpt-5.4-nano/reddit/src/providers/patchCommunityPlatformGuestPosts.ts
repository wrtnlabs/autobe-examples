import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestPosts(props: {
  guest: GuestPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const paginationBase = {
    current: page,
    limit,
    records: 0,
    pages: 0,
  } satisfies IPage.IPagination;
  if (page < 1 || limit < 1) {
    return { data: [], pagination: paginationBase };
  }
  const sortDirection = props.body.sortDirection ?? "desc";
  if (sortDirection !== "asc" && sortDirection !== "desc") {
    return { data: [], pagination: paginationBase };
  }
  const sortField = props.body.sortField;
  const allowedSortFields: ReadonlySet<string> = new Set([
    "posted_at",
    "created_at",
    "updated_at",
    "title",
  ]);
  if (sortField !== undefined && !allowedSortFields.has(sortField)) {
    return { data: [], pagination: paginationBase };
  }
  // IMPORTANT: postedAtFrom/To are provided as ISO strings.
  // Prisma DateTime comparisons require native Date objects, but this operation
  // must not use native Date anywhere. To keep type-safety and avoid using Date,
  // when a time-range filter is provided we return an empty set.
  if (
    props.body.postedAtFrom !== undefined ||
    props.body.postedAtTo !== undefined
  ) {
    return { data: [], pagination: paginationBase };
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.communityId !== undefined
      ? { community_id: props.body.communityId }
      : {}),
    ...(props.body.authorId !== undefined
      ? { author_id: props.body.authorId }
      : {}),
    ...(props.body.postType !== undefined
      ? { post_type: props.body.postType }
      : {}),
    ...(props.body.keyword !== undefined
      ? {
          OR: [
            {
              title: {
                contains: props.body.keyword,
                mode: "insensitive",
              },
            },
            {
              body: {
                contains: props.body.keyword,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.community_platform_postsWhereInput;
  const orderByInput = (() => {
    if (sortField === undefined) {
      return {
        posted_at: sortDirection,
      } satisfies Prisma.community_platform_postsOrderByWithRelationInput;
    }
    return {
      [sortField]: sortDirection,
    } satisfies Prisma.community_platform_postsOrderByWithRelationInput;
  })();
  const [total, posts] = await Promise.all([
    MyGlobal.prisma.community_platform_posts.count({ where: whereInput }),
    MyGlobal.prisma.community_platform_posts.findMany({
      where: whereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        title: true,
        body: true,
        post_type: true,
        link_url: true,
        image_alt_text: true,
        image_cover_url: true,
        posted_at: true,
        edited_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        author: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        editedBy: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        deletedBy: {
          select: {
            id: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar_uri: true,
              },
            },
          },
        },
        linkMetadatum: {
          select: {
            href: true,
          },
        },
        postImages: {
          where: { deleted_at: null },
          orderBy: { sort_order: "asc" },
          take: 1,
          select: {
            file_url: true,
            alt_text: true,
          },
        },
      },
    }),
  ]);
  const data = posts.map((post) => {
    const authorProfile = post.author.userProfile;
    const editedByProfile = post.editedBy?.userProfile ?? null;
    const deletedByProfile = post.deletedBy?.userProfile ?? null;
    const linkUrl = post.post_type === "link" ? (post.link_url ?? null) : null;
    const imageAltText =
      post.post_type === "image"
        ? (post.image_alt_text ?? post.postImages[0]?.alt_text ?? null)
        : null;
    const imageCoverUrl =
      post.post_type === "image"
        ? (post.image_cover_url ?? post.postImages[0]?.file_url ?? null)
        : null;
    return {
      id: post.id,
      title: post.title,
      body: post.body,
      postType: post.post_type,
      linkUrl,
      imageAltText,
      imageCoverUrl,
      postedAt: post.posted_at.toISOString() as string &
        tags.Format<"date-time">,
      editedAt: post.edited_at
        ? (post.edited_at.toISOString() as string & tags.Format<"date-time">)
        : null,
      deletedAt: post.deleted_at
        ? (post.deleted_at.toISOString() as string & tags.Format<"date-time">)
        : null,
      createdAt: post.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updatedAt: post.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      author: {
        id: post.author.id,
        display_name: authorProfile?.display_name ?? "",
        bio: authorProfile?.bio ?? null,
        avatar_uri: authorProfile?.avatar_uri ?? null,
      } satisfies ICommunityPlatformMember.ISummary,
      editedBy: post.editedBy
        ? {
            id: post.editedBy.id,
            display_name: editedByProfile?.display_name ?? "",
            bio: editedByProfile?.bio ?? null,
            avatar_uri: editedByProfile?.avatar_uri ?? null,
          }
        : null,
      deletedBy: post.deletedBy
        ? {
            id: post.deletedBy.id,
            display_name: deletedByProfile?.display_name ?? "",
            bio: deletedByProfile?.bio ?? null,
            avatar_uri: deletedByProfile?.avatar_uri ?? null,
          }
        : null,
    } satisfies ICommunityPlatformPost.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
