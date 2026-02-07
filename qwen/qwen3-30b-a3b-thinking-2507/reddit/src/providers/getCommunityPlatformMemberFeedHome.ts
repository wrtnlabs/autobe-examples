import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberFeedHome(props: {
  member: MemberPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const subscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (subscriptions.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const communityIds = subscriptions.map((sub) => sub.community_id);
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      community_id: { in: communityIds },
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      title: true,
      content_type: true,
      created_at: true,
      community_id: true,
      author_id: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              password_hash: true,
            },
          },
        },
      },
      author: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          password_hash: true,
        },
      },
    },
  });
  const transformedData = await ArrayUtil.asyncMap(data, (record) => ({
    id: record.id,
    title: record.title,
    content_type: record.content_type,
    community: record.community,
    author: record.author,
    created_at: toISOStringSafe(record.created_at),
    comments_count: 0,
    votes: 0,
  }));
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: {
      community_id: { in: communityIds },
      deleted_at: null,
    },
  });
  const pagination = {
    current: 1,
    limit: 20,
    records: total,
    pages: Math.ceil(total / 20),
  } satisfies IPage.IPagination;
  return {
    data: transformedData,
    pagination,
  };
}
