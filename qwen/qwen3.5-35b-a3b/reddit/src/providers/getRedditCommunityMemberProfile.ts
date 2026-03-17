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
import { RedditCommunityUserProfileTransformer } from "../transformers/RedditCommunityUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberProfile(props: {
  member: MemberPayload;
}): Promise<IRedditCommunityUserProfile> {
  const memberRecord = await MyGlobal.prisma.reddit_community_members.findFirst(
    {
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (memberRecord === null) {
    throw new HttpException("Member not found", 404);
  }
  const profileRecord =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirst({
      where: {
        reddit_community_user_id: props.member.id,
      },
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        avatar: {
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            created_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (profileRecord === null || profileRecord.deleted_at !== null) {
    throw new HttpException("Profile deleted", 404);
  }
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
      },
    });
  const postsPagination = await MyGlobal.prisma.reddit_community_posts.findMany(
    {
      where: {
        author_id: props.member.id,
        deleted_at: null,
      },
      take: 10,
      skip: 0,
      orderBy: {
        created_at: "desc",
      },
    },
  );
  const postsTotal = await MyGlobal.prisma.reddit_community_posts.count({
    where: {
      author_id: props.member.id,
      deleted_at: null,
    },
  });
  const commentsPagination =
    await MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        reddit_community_members_id: props.member.id,
        deleted_at: null,
      },
      take: 10,
      skip: 0,
      orderBy: {
        created_at: "desc",
      },
    });
  const commentsTotal = await MyGlobal.prisma.reddit_community_comments.count({
    where: {
      reddit_community_members_id: props.member.id,
      deleted_at: null,
    },
  });
  const transformedProfile =
    await RedditCommunityUserProfileTransformer.transform(profileRecord);
  const karmaData: IRedditCommunityUserKarma = {
    id:
      karmaRecord?.id ?? (crypto.randomUUID() as string & tags.Format<"uuid">),
    reddit_member_id: props.member.id,
    current_score: karmaRecord?.current_score ?? 0,
    created_at: karmaRecord?.created_at
      ? toISOStringSafe(karmaRecord.created_at)
      : toISOStringSafe(new Date()),
    updated_at: karmaRecord?.updated_at
      ? toISOStringSafe(karmaRecord.updated_at)
      : toISOStringSafe(new Date()),
  };
  const postsData: IPageIRedditCommunityPost.ISummary = {
    pagination: {
      current: 1,
      limit: 10,
      records: postsTotal,
      pages: Math.max(1, Math.ceil(postsTotal / 10)),
    } satisfies IPage.IPagination,
    data: postsPagination.map((post) => ({
      id: post.id,
      title: post.title,
      author: {
        id: props.member.id,
        username: memberRecord.username,
        created_at: toISOStringSafe(memberRecord.created_at),
      } satisfies IRedditCommunityMember.ISummary,
      community: {
        id: post.community_id,
        name: "",
        description: null,
        subscriber_count: 0,
        owner: {
          id: "",
          username: "",
          created_at: toISOStringSafe(new Date()),
        },
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      } satisfies IRedditCommunityCommunity.ISummary,
      vote_score: post.vote_score,
      comment_count: post.comment_count,
      created_at: toISOStringSafe(post.created_at),
      post_type: typia.assert<"text" | "link" | "image">(post.post_type),
      preview_content: null,
    })),
  };
  const commentsData: IPageIRedditCommunityComment.ISummary = {
    pagination: {
      current: 1,
      limit: 10,
      records: commentsTotal,
      pages: Math.max(1, Math.ceil(commentsTotal / 10)),
    } satisfies IPage.IPagination,
    data: commentsPagination.map((comment) => ({
      id: comment.id,
      voteScore: 0,
      createdAt: toISOStringSafe(comment.created_at),
      parentComment: null,
      replyCount: 0,
      author: {
        id: props.member.id,
        username: memberRecord.username,
        created_at: toISOStringSafe(memberRecord.created_at),
      } satisfies IRedditCommunityMember.ISummary,
    })),
  };
  return {
    ...transformedProfile,
    karma: karmaData,
    posts: postsData,
    comments: commentsData,
  } satisfies IRedditCommunityUserProfile;
}
