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

export async function postRedditCloneMemberRedditClonePostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.ICreate;
}): Promise<IRedditClonePostVote> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_clone_member_id: true },
  });
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
  const now = new Date();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const getKarmaAdjustment = (
      currentDir: string | null,
      newDir: string,
    ): number => {
      if (currentDir === null) {
        return newDir === "upvote" ? 1 : -1;
      }
      if (currentDir === newDir) {
        return 0;
      }
      if (currentDir === "upvote" && newDir === "downvote") {
        return -2;
      }
      return 2;
    };
    const adjustment = getKarmaAdjustment(
      existingVote?.direction ?? null,
      props.body.direction,
    );
    let voteRecord;
    if (existingVote === null) {
      voteRecord = await tx.reddit_clone_post_votes.create({
        data: {
          id: v4(),
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.postId,
          direction: props.body.direction,
          created_at: now,
          updated_at: now,
        },
      });
    } else if (existingVote.direction === props.body.direction) {
      throw new HttpException("Already voted in this direction", 409);
    } else {
      voteRecord = await tx.reddit_clone_post_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: props.body.direction,
          updated_at: now,
        },
      });
    }
    if (adjustment !== 0) {
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: { vote_score: { increment: adjustment } },
      });
      await tx.reddit_clone_user_karmas.upsert({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        create: {
          id: v4(),
          reddit_clone_member_id: post.reddit_clone_member_id,
          karma_score: adjustment,
          created_at: now,
          updated_at: now,
        },
        update: {
          karma_score: { increment: adjustment },
          updated_at: now,
        },
      });
    }
    return voteRecord;
  });
  const voteWithRelations =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: { id: result.id },
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
                        url: true,
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
  const memberSummary = {
    id: voteWithRelations.member.id,
    username: voteWithRelations.member.username,
  } satisfies IRedditCloneMember.ISummary;
  const postCommunityIcon =
    voteWithRelations.post.community.icon?.file?.url ?? null;
  const postCommunitySummary = {
    id: voteWithRelations.post.community.id,
    name: voteWithRelations.post.community.name,
    description: voteWithRelations.post.community.description,
    subscriberCount: voteWithRelations.post.community.subscriber_count,
    owner: {
      id: voteWithRelations.post.community.member.id,
      username: voteWithRelations.post.community.member.username,
    } satisfies IRedditCloneMember.ISummary,
    icon: postCommunityIcon,
  } satisfies IRedditCloneCommunity.ISummary;
  const getContentPreview = (): string => {
    switch (voteWithRelations.post.type) {
      case "text":
        return (
          voteWithRelations.post.postTextContent?.body?.substring(0, 200) ?? ""
        );
      case "image":
        return voteWithRelations.post.image?.reddit_clone_file_id ?? "";
      case "link":
        try {
          return voteWithRelations.post.link?.url
            ? new URL(voteWithRelations.post.link.url).hostname
            : "";
        } catch {
          return voteWithRelations.post.link?.url ?? "";
        }
      default:
        return "";
    }
  };
  const postSummary = {
    id: voteWithRelations.post.id,
    title: voteWithRelations.post.title,
    type: voteWithRelations.post.type as "text" | "link" | "image",
    voteScore: voteWithRelations.post.vote_score,
    commentCount: voteWithRelations.post.comment_count,
    contentPreview: getContentPreview(),
    createdAt: voteWithRelations.post.created_at.toISOString(),
    author: {
      id: voteWithRelations.post.author.id,
      username: voteWithRelations.post.author.username,
    } satisfies IRedditCloneMember.ISummary,
    community: postCommunitySummary,
  } satisfies IRedditClonePost.ISummary;
  return {
    id: voteWithRelations.id,
    direction: voteWithRelations.direction,
    created_at: voteWithRelations.created_at.toISOString(),
    updated_at: voteWithRelations.updated_at.toISOString(),
    member: memberSummary,
    post: postSummary,
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
// import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberRedditClonePostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.ICreate;
// }): Promise<IRedditClonePostVote> {
//   const record = await MyGlobal.prisma.reddit_clone_post_votes.create({
//     data: await RedditClonePostVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditClonePostVoteTransformer.select(),
//   });
//   return await RedditClonePostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------