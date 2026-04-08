import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneRedditClonePostsPostIdVotesVoteId(props: {
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditClonePostVote> {
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      reddit_clone_post_id: true,
      member: {
        select: {
          id: true,
          username: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          type: true,
          vote_score: true,
          comment_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          reddit_clone_member_id: true,
          reddit_clone_community_id: true,
          author: {
            select: {
              id: true,
              username: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              subscriber_count: true,
              reddit_clone_member_id: true,
            },
          },
          postTextContent: {
            select: {
              body: true,
            },
          },
          link: {
            select: {
              url: true,
            },
          },
          image: {
            select: {
              reddit_clone_file_id: true,
            },
          },
        },
      },
    },
  });
  if (vote.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  const post = vote.post;
  let contentPreview = "";
  if (post.type === "text" && post.postTextContent) {
    contentPreview = post.postTextContent.body?.substring(0, 200) ?? "";
  } else if (post.type === "image" && post.image) {
    contentPreview = post.image.reddit_clone_file_id ?? "";
  } else if (post.type === "link" && post.link) {
    try {
      contentPreview = new URL(post.link.url).hostname;
    } catch {
      contentPreview = post.link.url;
    }
  }
  return {
    id: vote.id,
    direction: vote.direction,
    created_at: vote.created_at.toISOString(),
    updated_at: vote.updated_at.toISOString(),
    member: {
      id: vote.member.id,
      username: vote.member.username,
    } satisfies IRedditCloneMember.ISummary,
    post: {
      id: post.id,
      title: post.title,
      type: post.type as "text" | "link" | "image",
      voteScore: post.vote_score,
      commentCount: post.comment_count,
      createdAt: post.created_at.toISOString(),
      author: {
        id: post.author.id,
        username: post.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        subscriberCount: post.community.subscriber_count,
        owner: {
          id: post.author.id,
          username: post.author.username,
        } satisfies IRedditCloneMember.ISummary,
        icon: undefined,
      } satisfies IRedditCloneCommunity.ISummary,
      contentPreview: contentPreview,
    } satisfies IRedditClonePost.ISummary,
  } satisfies IRedditClonePostVote;
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
// import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneRedditClonePostsPostIdVotesVoteId(props: {
//   postId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
// }): Promise<IRedditClonePostVote> {
//   const record = await MyGlobal.prisma.reddit_clone_post_votes.findFirstOrThrow({
//     ...RedditClonePostVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditClonePostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------