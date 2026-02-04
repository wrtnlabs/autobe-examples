import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberPostsControversial(props: {
  member: MemberPayload;
}): Promise<IPageICommunityPlatformPost.ISum> {
  const page = 1;
} // Default page  const limit = 20; // 20 posts per page  const skip = (page - 1) * limit;  // Direct database query to select all required fields for ICommunityPlatformPost.ISummary  const posts = await MyGlobal.prisma.community_platform_posts.findMany({    orderBy: {      vote_score: "desc",    },    skip,    take: limit,    select: {      id: true,      created_at: true,      vote_score: true,      comment_count: true,      author_id: true,      community_id: true,      title: true, // Required for ICommunityPlatformPost.ISummary      // Select related data for contentType and contentSummary      post_texts: {        select: {          text_content: true,        },      },      post_urls: {        select: {          url: true,        },      },      post_images: {        select: {          image_url: true,        },      },      // Select author and community for summary      author: {        select: {          id: true,        },      },      community: {        select: {          id: true,          name: true,          description: true,          icon: true,          subscriber_count: true,          created_at: true,        },      },    },  });  // Count total posts (for pagination)  const total = await MyGlobal.prisma.community_platform_posts.count();  // Transform posts to match ICommunityPlatformPost.ISummary interface  const mappedPosts = posts.map((post) => {    // Determine contentType based on which related entity exists    let contentType: "text" | "link" | "image" = "text";    let contentSummary = "";    // Check for post text    if (post.post_texts && post.post_texts.length > 0) {      contentType = "text";      contentSummary = post.post_texts[0].text_content.substring(0, 200);    }    // Check for post URL    else if (post.post_urls && post.post_urls.length > 0) {      contentType = "link";      try {        const url = new URL(post.post_urls[0].url);        contentSummary = url.hostname;      } catch {        contentSummary = post.post_urls[0].url.substring(0, 100);      }    }    // Check for post image    else if (post.post_images && post.post_images.length > 0) {      contentType = "image";      contentSummary = "image";    }    // Map to ICommunityPlatformPost.ISummary structure    return {      id: post.id,      title: post.title,      createdAt: toISOStringSafe(post.created_at),      voteScore: post.vote_score,      commentCount: post.comment_count,      author: {        id: post.author.id,      },      community: {        name: post.community.name,        description: post.community.description,        icon: post.community.icon || "",        subscriber_count: post.community.subscriber_count,        created_at: toISOStringSafe(post.community.created_at),      },      contentType, // Direct assignment      contentSummary, // Direct assignment    };  });  return {    data: mappedPosts,    pagination: {      current: page,      limit,      records: total,      pages: Math.ceil(total / limit),    } satisfies IPage.IPagination,  };}
