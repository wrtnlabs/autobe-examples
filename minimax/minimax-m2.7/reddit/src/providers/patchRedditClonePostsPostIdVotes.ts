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

export async function patchRedditClonePostsPostIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  // Verify post exists and is not soft-deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Placeholder for member ID from auth context
  const memberId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  // Check for existing vote
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique(
    {
      where: {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: memberId,
          reddit_clone_post_id: props.postId,
        },
      },
      select: {
        id: true,
        direction: true,
      },
    },
  );
  const direction = props.body.direction;
  const scoreDelta = direction === "upvote" ? 1 : -1;
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (!existingVote) {
      await tx.reddit_clone_post_votes.create({
        data: {
          id: v4(),
          reddit_clone_member_id: memberId,
          reddit_clone_post_id: props.postId,
          direction: direction,
          created_at: now,
          updated_at: now,
        },
      });
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: { vote_score: { increment: scoreDelta } },
      });
    } else if (existingVote.direction === direction) {
      await tx.reddit_clone_post_votes.delete({
        where: { id: existingVote.id },
      });
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: { vote_score: { increment: -scoreDelta } },
      });
    } else {
      await tx.reddit_clone_post_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: direction,
          updated_at: now,
        },
      });
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: { vote_score: { increment: scoreDelta * 2 } },
      });
    }
  });
  // Fetch vote with proper nested relations for response
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique({
    where: {
      reddit_clone_member_id_reddit_clone_post_id: {
        reddit_clone_member_id: memberId,
        reddit_clone_post_id: props.postId,
      },
    },
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
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
              member: {
                select: {
                  id: true,
                  username: true,
                },
              },
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
  if (!vote) {
    throw new HttpException("Vote removed", 200);
  }
  // Manually transform to match IRedditClonePostVote DTO
  const contentPreview = getContentPreview(vote.post);
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
      id: vote.post.id,
      title: vote.post.title,
      type: vote.post.type as "text" | "link" | "image",
      voteScore: vote.post.vote_score,
      commentCount: vote.post.comment_count,
      createdAt: vote.post.created_at.toISOString(),
      author: {
        id: vote.post.author.id,
        username: vote.post.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: vote.post.community.id,
        name: vote.post.community.name,
        description: vote.post.community.description,
        subscriberCount: vote.post.community.subscriber_count,
        owner: {
          id: vote.post.community.member.id,
          username: vote.post.community.member.username,
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      contentPreview: contentPreview,
    } satisfies IRedditClonePost.ISummary,
  };
}
function getContentPreview(post: {
  type: string;
  postTextContent: {
    body: string;
  } | null;
  link: {
    url: string;
  } | null;
  image: {
    reddit_clone_file_id: string;
  } | null;
}): string {
  switch (post.type) {
    case "text":
      return post.postTextContent?.body?.substring(0, 200) ?? "";
    case "image":
      return post.image?.reddit_clone_file_id ?? "";
    case "link":
      try {
        return post.link?.url ? new URL(post.link.url).hostname : "";
      } catch {
        return post.link?.url ?? "";
      }
    default:
      return "";
  }
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
// export async function patchRedditClonePostsPostIdVotes(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.IUpdate;
// }): Promise<IRedditClonePostVote> {
//   const record = await MyGlobal.prisma.reddit_clone_post_votes.findFirstOrThrow({
//     ...RedditClonePostVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditClonePostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------