import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function getRedditCommunityMemberProfile(props: {
  member: MemberPayload;
}): Promise<IRedditCommunityUserProfile> {
  // Query user profile with joined user and karma
  const profileRecord =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirstOrThrow({
      where: {
        reddit_community_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        bio: true,
        avatar_image_url_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            created_at: true,
          },
        },
        avatar: {
          select: {
            id: true,
          },
        },
      },
    });
  // Fetch karma record (one-to-one relationship)
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findFirstOrThrow({
      where: {
        reddit_community_member_id: profileRecord.user.id,
      },
    });
  // Default pagination values
  const postsPage: number = 1;
  const postsLimit: number = 20;
  const postsSkip: number = (postsPage - 1) * postsLimit;
  const commentsPage: number = 1;
  const commentsLimit: number = 20;
  const commentsSkip: number = (commentsPage - 1) * commentsLimit;
  // Fetch posts with pagination and community relation
  const postsData = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: {
      author_id: profileRecord.user.id,
      deleted_at: null,
    },
    skip: postsSkip,
    take: postsLimit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      post_type: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          subscriber_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              created_at: true,
            },
          },
          icon: {
            select: {
              file_id: true,
            },
          },
        },
      },
    },
  });
  const postsTotal: number = await MyGlobal.prisma.reddit_community_posts.count(
    {
      where: {
        author_id: profileRecord.user.id,
        deleted_at: null,
      },
    },
  );
  // Fetch comments with pagination
  const commentsData = await MyGlobal.prisma.reddit_community_comments.findMany(
    {
      where: {
        reddit_community_members_id: profileRecord.user.id,
        deleted_at: null,
      },
      skip: commentsSkip,
      take: commentsLimit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        body: true,
      },
    },
  );
  const commentsTotal: number =
    await MyGlobal.prisma.reddit_community_comments.count({
      where: {
        reddit_community_members_id: profileRecord.user.id,
        deleted_at: null,
      },
    });
  // Transform community to summary format
  function transformCommunity(community: {
    id: string;
    name: string;
    description: string | null;
    subscriber_count: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    owner: {
      id: string;
      username: string;
      created_at: Date;
    };
    icon: {
      file_id: string | null;
    } | null;
  }): IRedditCommunityCommunity.ISummary {
    const iconUrl = community.icon?.file_id
      ? `https://cdn.example.com/files/${community.icon.file_id}`
      : undefined;
    return {
      id: community.id,
      name: community.name,
      description: community.description ?? null,
      subscriber_count: community.subscriber_count,
      owner: {
        id: community.owner.id,
        username: community.owner.username,
        created_at: community.owner.created_at.toISOString(),
      },
      created_at: community.created_at.toISOString(),
      updated_at: community.updated_at.toISOString(),
      deleted_at: community.deleted_at?.toISOString() ?? null,
      icon_url: iconUrl,
    };
  }
  // Construct response object with proper date formatting
  const response: IRedditCommunityUserProfile = {
    id: profileRecord.id,
    user: {
      id: profileRecord.user.id,
      username: profileRecord.user.username,
      created_at: toISOStringSafe(profileRecord.user.created_at),
      karma: karmaRecord.current_score,
    },
    avatar_image_url_id: profileRecord.avatar?.id ?? null,
    display_name: profileRecord.display_name,
    bio: profileRecord.bio ?? null,
    karma: {
      id: karmaRecord.id,
      reddit_member_id: karmaRecord.reddit_community_member_id,
      current_score: karmaRecord.current_score,
      created_at: toISOStringSafe(karmaRecord.created_at),
      updated_at: toISOStringSafe(karmaRecord.updated_at),
    },
    posts: {
      pagination: {
        current: postsPage,
        limit: postsLimit,
        records: postsTotal,
        pages: Math.ceil(postsTotal / postsLimit),
      } satisfies IPage.IPagination,
      data: postsData.map((post) => ({
        id: post.id,
        title: post.title,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        created_at: toISOStringSafe(post.created_at),
        post_type: typia.assert<"text" | "link" | "image">(post.post_type),
        author: {
          id: profileRecord.user.id,
          username: profileRecord.user.username,
          created_at: toISOStringSafe(profileRecord.user.created_at),
        },
        community: transformCommunity(post.community),
        preview_content: null,
      })),
    },
    comments: {
      pagination: {
        current: commentsPage,
        limit: commentsLimit,
        records: commentsTotal,
        pages: Math.ceil(commentsTotal / commentsLimit),
      } satisfies IPage.IPagination,
      data: commentsData.map((comment) => ({
        id: comment.id,
        createdAt: toISOStringSafe(comment.created_at),
        body: comment.body,
        voteScore: 0,
        parentComment: null,
        replyCount: 0,
        author: {
          id: profileRecord.user.id,
          username: profileRecord.user.username,
          created_at: toISOStringSafe(profileRecord.user.created_at),
        },
      })),
    },
    created_at: toISOStringSafe(profileRecord.created_at),
    updated_at: toISOStringSafe(profileRecord.updated_at),
    deleted_at:
      profileRecord.deleted_at === null
        ? null
        : toISOStringSafe(profileRecord.deleted_at),
  };
  return response;
}
