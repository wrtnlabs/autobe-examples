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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_clone_member_id: true, vote_score: true },
  });
  const newDirectionValue = props.body.direction === "upvote" ? 1 : -1;
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique(
    {
      where: {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.postId,
        },
      },
    },
  );
  if (existingVote === null) {
    await MyGlobal.prisma.reddit_clone_post_votes.create({
      data: {
        id: v4(),
        reddit_clone_member_id: props.member.id,
        reddit_clone_post_id: props.postId,
        direction: props.body.direction,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: { vote_score: post.vote_score + newDirectionValue },
    });
    await MyGlobal.prisma.reddit_clone_user_karmas.upsert({
      where: { reddit_clone_member_id: post.reddit_clone_member_id },
      create: {
        id: v4(),
        reddit_clone_member_id: post.reddit_clone_member_id,
        karma_score: newDirectionValue,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        karma_score: { increment: newDirectionValue },
        updated_at: new Date(),
      },
    });
  } else if (existingVote.direction === props.body.direction) {
    // Idempotent - same direction, no changes needed
  } else {
    await MyGlobal.prisma.reddit_clone_post_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
    });
    const oldDirectionValue = existingVote.direction === "upvote" ? 1 : -1;
    const delta = newDirectionValue - oldDirectionValue;
    await MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: { vote_score: post.vote_score + delta },
    });
    await MyGlobal.prisma.reddit_clone_user_karmas.upsert({
      where: { reddit_clone_member_id: post.reddit_clone_member_id },
      create: {
        id: v4(),
        reddit_clone_member_id: post.reddit_clone_member_id,
        karma_score: delta,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        karma_score: { increment: delta },
        updated_at: new Date(),
      },
    });
  }
  const updatedVote =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: props.member.id,
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
                icon: {
                  select: {
                    file: {
                      select: {
                        storage_path: true,
                      },
                    },
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
  return {
    id: updatedVote.id,
    direction: updatedVote.direction,
    created_at: updatedVote.created_at.toISOString(),
    updated_at: updatedVote.updated_at.toISOString(),
    member: {
      id: updatedVote.member.id,
      username: updatedVote.member.username,
    } satisfies IRedditCloneMember.ISummary,
    post: {
      id: updatedVote.post.id,
      title: updatedVote.post.title,
      type: updatedVote.post.type as "text" | "link" | "image",
      voteScore: updatedVote.post.vote_score,
      commentCount: updatedVote.post.comment_count,
      createdAt: updatedVote.post.created_at.toISOString(),
      author: {
        id: updatedVote.post.author.id,
        username: updatedVote.post.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: updatedVote.post.community.id,
        name: updatedVote.post.community.name,
        description: updatedVote.post.community.description,
        subscriberCount: updatedVote.post.community.subscriber_count,
        owner: {
          id: updatedVote.post.community.member.id,
          username: updatedVote.post.community.member.username,
        } satisfies IRedditCloneMember.ISummary,
        icon: updatedVote.post.community.icon?.file?.storage_path ?? null,
      } satisfies IRedditCloneCommunity.ISummary,
      contentPreview: getContentPreview(updatedVote.post),
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
// export async function putRedditCloneMemberPostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.IUpdate;
// }): Promise<IRedditClonePostVote> {
//   await MyGlobal.prisma.reddit_clone_post_votes.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
//     where: { ... },
//     ...RedditClonePostVoteTransformer.select(),
//   });
//   return await RedditClonePostVoteTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------