import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
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

export async function patchCommunityAdminFeedCommunityCommunityId(props: {
  admin: AdminPayload;
  communityId: string;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // Default sort algorithm
  const sortAlgorithm = "new";
  // Validate admin has access to community
  const subscription = await MyGlobal.prisma.community_subscriptions.findFirst({
    where: {
      community_member_id: props.admin.id,
      community_community_id: props.communityId,
    },
  });
  if (!subscription) {
    throw new HttpException("Admin not subscribed to community", 403);
  }
  // Define where clause for posts
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
    community_post_status_id: {
      notIn: ["deleted", "archived"],
    },
  } satisfies Prisma.community_postsWhereInput;
  // Get posts with all required relationships
  const posts = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    take: 100,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      title: true,
      content_type: true,
      created_at: true,
      community_id: true,
      community_member_id: true,
      community_post_status_id: true,
      // Use correct relation names from schema
      postVotes: {
        select: {
          vote_type: true,
        },
      },
      community_post_comments_counts: {
        select: {
          comment_count: true,
        },
      },
      community_post_links: {
        select: {
          url: true,
          domain_name: true,
        },
      },
      community_post_images: {
        select: {
          thumbnail_reference: true,
        },
      },
      // Use correct relation names from schema
      community_members: {
        select: {
          display_name: true, // Use display_name as per schema
        },
      },
      community_communities: {
        select: {
          name: true,
        },
      },
    },
  });
  // Calculate total posts count
  const total = await MyGlobal.prisma.community_posts.count({
    where: {
      community_id: props.communityId,
      deleted_at: null,
      community_post_status_id: {
        notIn: ["deleted", "archived"],
      },
    },
  });
  // Transform each post to ISummary
  const summaryData = posts.map((post) => {
    // Calculate vote_score based on upvotes/downvotes - 1 for upvote, -1 for downvote
    const totalScore = post.postVotes.reduce(
      (
        sum: number,
        vote: {
          vote_type: string;
        },
      ) => {
        if (vote.vote_type === "upvote") return sum + 1;
        if (vote.vote_type === "downvote") return sum - 1;
        return sum;
      },
      0,
    );
    // Get thumbnail or domain based on content_type
    let thumbnail_url: string | undefined;
    let domain: string | undefined;
    if (post.community_post_images && post.community_post_images.length > 0) {
      thumbnail_url = post.community_post_images[0].thumbnail_reference;
    } else if (
      post.community_post_links &&
      post.community_post_links.length > 0
    ) {
      domain = post.community_post_links[0].domain_name;
    }
    // Get comment count
    const commentCount = post.community_post_comments_counts
      ? post.community_post_comments_counts.comment_count
      : 0;
    // Extract author and community names from joined relations
    const author_username = post.community_members
      ? post.community_members.display_name
      : "unknown";
    const community_name = post.community_communities
      ? post.community_communities.name
      : "unknown";
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      author_username: author_username satisfies string as string,
      community_name: community_name satisfies string as string,
      vote_score: totalScore,
      comment_count: commentCount,
      created_at: toISOStringSafe(post.created_at) as string &
        tags.Format<"date-time">,
      content_type: post.content_type,
      thumbnail_url: thumbnail_url as string | undefined,
      domain: domain as string | undefined,
    };
  });
  return {
    data: summaryData,
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    } satisfies IPage.IPagination,
  };
}
