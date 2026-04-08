import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestPostsPostIdStatistics(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPost.IStatistic> {
  // 1. Validate post exists and is not soft-deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: {
      id: true,
      author_id: true,
      community_id: true,
      created_at: true,
      updated_at: true,
      upvotes_count: true,
      downvotes_count: true,
      comment_count: true,
      author: {
        select: {
          id: true,
          username: true,
          email: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          comments: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              upvotes_count: true,
              downvotes_count: true,
              comment_count: true,
              reddit_platform_post_id: true,
              reddit_platform_member_id: true,
              reddit_platform_comments_id: true,
              content: true,
              score: true,
            },
          },
          communityMemberships: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              user_id: true,
              role: true,
              joined_at: true,
            },
          },
          bannedUserRecords: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              banned_at: true,
              reason: true,
              user_id: true,
              unbanned_at: true,
              banned_by: true,
            },
          },
          subscriptions: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              subscribed_at: true,
              user_id: true,
            },
          },
          posts: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              author_id: true,
              title: true,
              post_type: true,
              upvotes_count: true,
              downvotes_count: true,
              comment_count: true,
            },
          },
          banRecords: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              banned_at: true,
              reason: true,
              user_id: true,
              unbanned_at: true,
              banned_by: true,
            },
          },
          banRecordSnapshots: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              banned_at: true,
              reason: true,
              unbanned_at: true,
              reddit_platform_ban_record_id: true,
              reddit_platform_user_id: true,
              reddit_platform_community_id: true,
              reddit_platform_banned_by_id: true,
            },
          },
          password_hash: true,
          sessions: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              expired_at: true,
              ip: true,
              reddit_platform_member_id: true,
              token: true,
              refresh_token: true,
              href: true,
              referrer: true,
              revoked_at: true,
            },
          },
          passwordResets: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              token: true,
              expires_at: true,
              member_id: true,
              used_at: true,
            },
          },
          emailVerifications: {
            select: {
              email: true,
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              reddit_platform_member_id: true,
              token: true,
              expires_at: true,
            },
          },
          ownedCommunities: {
            select: {
              created_at: true,
              name: true,
              id: true,
              owner_id: true,
              description: true,
              icon_url: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          issuedBannedUserRecords: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              banned_at: true,
              reason: true,
              user_id: true,
              unbanned_at: true,
              banned_by: true,
            },
          },
          postVotes: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              reddit_platform_post_id: true,
              reddit_platform_member_id: true,
              vote_type: true,
            },
          },
          commentVotes: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              reddit_platform_member_id: true,
              vote_type: true,
              reddit_platform_comment_id: true,
            },
          },
          issuedBanRecords: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              banned_at: true,
              reason: true,
              user_id: true,
              unbanned_at: true,
              banned_by: true,
            },
          },
          banRecordSnapshotsIssueds: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              banned_at: true,
              reason: true,
              unbanned_at: true,
              reddit_platform_ban_record_id: true,
              reddit_platform_user_id: true,
              reddit_platform_community_id: true,
              reddit_platform_banned_by_id: true,
            },
          },
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
              email: true,
              karma: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              comments: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  upvotes_count: true,
                  downvotes_count: true,
                  comment_count: true,
                  reddit_platform_post_id: true,
                  reddit_platform_member_id: true,
                  reddit_platform_comments_id: true,
                  content: true,
                  score: true,
                },
              },
              communityMemberships: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  community_id: true,
                  user_id: true,
                  role: true,
                  joined_at: true,
                },
              },
              bannedUserRecords: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  community_id: true,
                  banned_at: true,
                  reason: true,
                  user_id: true,
                  unbanned_at: true,
                  banned_by: true,
                },
              },
              subscriptions: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  community_id: true,
                  subscribed_at: true,
                  user_id: true,
                },
              },
              posts: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  community_id: true,
                  author_id: true,
                  title: true,
                  post_type: true,
                  upvotes_count: true,
                  downvotes_count: true,
                  comment_count: true,
                },
              },
              banRecords: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  community_id: true,
                  banned_at: true,
                  reason: true,
                  user_id: true,
                  unbanned_at: true,
                  banned_by: true,
                },
              },
              banRecordSnapshots: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  banned_at: true,
                  reason: true,
                  unbanned_at: true,
                  reddit_platform_ban_record_id: true,
                  reddit_platform_user_id: true,
                  reddit_platform_community_id: true,
                  reddit_platform_banned_by_id: true,
                },
              },
              password_hash: true,
              sessions: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  expired_at: true,
                  ip: true,
                  reddit_platform_member_id: true,
                  token: true,
                  refresh_token: true,
                  href: true,
                  referrer: true,
                  revoked_at: true,
                },
              },
              passwordResets: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  token: true,
                  expires_at: true,
                  member_id: true,
                  used_at: true,
                },
              },
              emailVerifications: {
                select: {
                  email: true,
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  reddit_platform_member_id: true,
                  token: true,
                  expires_at: true,
                },
              },
              ownedCommunities: {
                select: {
                  created_at: true,
                  name: true,
                  id: true,
                  owner_id: true,
                  description: true,
                  icon_url: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              issuedBannedUserRecords: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  community_id: true,
                  banned_at: true,
                  reason: true,
                  user_id: true,
                  unbanned_at: true,
                  banned_by: true,
                },
              },
              postVotes: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  reddit_platform_post_id: true,
                  reddit_platform_member_id: true,
                  vote_type: true,
                },
              },
              commentVotes: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  reddit_platform_member_id: true,
                  vote_type: true,
                  reddit_platform_comment_id: true,
                },
              },
              issuedBanRecords: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  community_id: true,
                  banned_at: true,
                  reason: true,
                  user_id: true,
                  unbanned_at: true,
                  banned_by: true,
                },
              },
              banRecordSnapshotsIssueds: {
                select: {
                  created_at: true,
                  id: true,
                  updated_at: true,
                  deleted_at: true,
                  banned_at: true,
                  reason: true,
                  unbanned_at: true,
                  reddit_platform_ban_record_id: true,
                  reddit_platform_user_id: true,
                  reddit_platform_community_id: true,
                  reddit_platform_banned_by_id: true,
                },
              },
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
          snapshots: {
            select: {
              created_at: true,
              id: true,
              name: true,
              description: true,
              icon_url: true,
              community_id: true,
            },
          },
          communityMemberships: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              user_id: true,
              role: true,
              joined_at: true,
            },
          },
          bannedUserRecords: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              banned_at: true,
              reason: true,
              user_id: true,
              unbanned_at: true,
              banned_by: true,
            },
          },
          subscriptions: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              subscribed_at: true,
              user_id: true,
            },
          },
          posts: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              author_id: true,
              title: true,
              post_type: true,
              upvotes_count: true,
              downvotes_count: true,
              comment_count: true,
            },
          },
          reports: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              reviewed_at: true,
              status: true,
              community_id: true,
              reason: true,
              reported_by: true,
              reviewed_by: true,
              target_type: true,
              target_id: true,
            },
          },
          banRecords: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              community_id: true,
              banned_at: true,
              reason: true,
              user_id: true,
              unbanned_at: true,
              banned_by: true,
            },
          },
          banRecordSnapshots: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              banned_at: true,
              reason: true,
              unbanned_at: true,
              reddit_platform_ban_record_id: true,
              reddit_platform_user_id: true,
              reddit_platform_community_id: true,
              reddit_platform_banned_by_id: true,
            },
          },
        },
      },
    },
  });
  // 2. Query votes for this post
  const votes = await MyGlobal.prisma.reddit_platform_post_votes.findMany({
    where: { reddit_platform_post_id: props.postId },
    select: { vote_type: true },
  });
  // Calculate vote metrics
  const upvotesCount = votes.filter((v) => v.vote_type === "up").length;
  const downvotesCount = votes.filter((v) => v.vote_type === "down").length;
  const totalVotes = upvotesCount + downvotesCount;
  const uniqueVotersCount = votes.length;
  const voteRatio =
    totalVotes === 0
      ? 0
      : Math.round((upvotesCount / totalVotes) * 1000) / 1000;
  // 3. Query comments for this post (excluding soft-deleted)
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: { reddit_platform_post_id: props.postId, deleted_at: null },
    select: {
      id: true,
      reddit_platform_comments_id: true,
      score: true,
    },
    orderBy: { score: "desc" },
  });
  // Calculate comment metrics
  const rootCommentCount = comments.filter(
    (c) => c.reddit_platform_comments_id === null,
  ).length;
  const replyCommentCount = comments.filter(
    (c) => c.reddit_platform_comments_id !== null,
  ).length;
  const topCommentId = comments.length > 0 ? comments[0].id : null;
  // 4. Calculate derived metrics
  const votesPerCommentRatio =
    comments.length === 0 ? 0 : totalVotes / comments.length;
  const postAgeMs = Date.now() - post.created_at.getTime();
  const postAgeDays = postAgeMs / (1000 * 60 * 60 * 24);
  const commentDensity = postAgeDays === 0 ? 0 : comments.length / postAgeDays;
  // 5. Query recent activity (24h and 7d)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent24hComments =
    await MyGlobal.prisma.reddit_platform_comments.count({
      where: {
        reddit_platform_post_id: props.postId,
        created_at: { gte: twentyFourHoursAgo },
      },
    });
  const recent24hVotes = await MyGlobal.prisma.reddit_platform_post_votes.count(
    {
      where: {
        reddit_platform_post_id: props.postId,
        created_at: { gte: twentyFourHoursAgo },
      },
    },
  );
  const recent7dComments = await MyGlobal.prisma.reddit_platform_comments.count(
    {
      where: {
        reddit_platform_post_id: props.postId,
        created_at: { gte: sevenDaysAgo },
      },
    },
  );
  const recent7dVotes = await MyGlobal.prisma.reddit_platform_post_votes.count({
    where: {
      reddit_platform_post_id: props.postId,
      created_at: { gte: sevenDaysAgo },
    },
  });
  // Calculate engagement velocity
  const engagementVelocity = (recent24hComments + recent24hVotes) / 24.0;
  return {
    id: post.id,
    author: await RedditPlatformMemberAtSummaryTransformer.transform(
      post.author,
    ),
    community: await RedditPlatformCommunityAtSummaryTransformer.transform(
      post.community,
    ),
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    upvotes_count: upvotesCount,
    downvotes_count: downvotesCount,
    total_votes: totalVotes,
    vote_ratio: voteRatio,
    unique_voters_count: uniqueVotersCount,
    comment_count: comments.length,
    root_comment_count: rootCommentCount,
    reply_comment_count: replyCommentCount,
    top_comment_id: topCommentId,
    votes_per_comment_ratio: votesPerCommentRatio,
    comment_density: commentDensity,
    engagement_velocity: engagementVelocity,
    recent_activity_24h: {
      comment_count: recent24hComments,
      vote_count: recent24hVotes,
      unique_voters_count: uniqueVotersCount,
    },
    recent_activity_7d: {
      comment_count: recent7dComments,
      vote_count: recent7dVotes,
      unique_voters_count: uniqueVotersCount,
    },
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformGuestPostsPostIdStatistics(props: {
//   guest: GuestPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformPost.IStatistic> {
//   return {
//     id: ...,
//     author: await RedditPlatformMemberAtSummaryTransformer.transform(...),
//     community: await RedditPlatformCommunityAtSummaryTransformer.transform(...),
//     created_at: ...,
//     updated_at: ...,
//     upvotes_count: ...,
//     downvotes_count: ...,
//     total_votes: ...,
//     vote_ratio: ...,
//     unique_voters_count: ...,
//     comment_count: ...,
//     root_comment_count: ...,
//     reply_comment_count: ...,
//     top_comment_id: ...,
//     votes_per_comment_ratio: ...,
//     comment_density: ...,
//     engagement_velocity: ...,
//     recent_activity_24h: ...,
//     recent_activity_7d: ...,
//   };
// }
// ```
//--------------------------------------------------------------