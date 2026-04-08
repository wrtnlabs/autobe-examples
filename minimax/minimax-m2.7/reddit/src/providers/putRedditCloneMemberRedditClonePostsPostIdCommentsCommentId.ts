import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberRedditClonePostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_clone_post_id: true,
      reddit_clone_member_id: true,
      deleted_at: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted comment", 400);
  }
  if (comment.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
                icon: true,
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
            comments: true,
            postVotes: true,
          },
        },
        member: {
          select: {
            id: true,
            username: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            member: {
              select: {
                id: true,
                username: true,
              },
            },
            parent: true,
            replies: true,
          },
        },
        replies: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            member: {
              select: {
                id: true,
                username: true,
              },
            },
            parent: true,
            replies: true,
          },
        },
      },
    },
  );
  return RedditCloneCommentTransformer.transform(updated);
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
// import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberRedditClonePostsPostIdCommentsCommentId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditCloneComment.IUpdate;
// }): Promise<IRedditCloneComment> {
//   await MyGlobal.prisma.reddit_clone_comments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneCommentTransformer.select(),
//   });
//   return await RedditCloneCommentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------