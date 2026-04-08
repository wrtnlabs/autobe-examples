import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
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

export async function putRedditCloneMemberPostsPostIdTextContent(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostTextContent.IUpdate;
}): Promise<IRedditClonePost> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      reddit_clone_community_id: true,
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
          created_at: true,
          updated_at: true,
          deleted_at: true,
          member: {
            select: {
              id: true,
              username: true,
            },
          },
          communityIcons: {
            select: {
              id: true,
            },
          },
        },
      },
      postTextContent: {
        select: {
          id: true,
          body: true,
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
                  created_at: true,
                  member: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      link: true,
      image: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.type !== "text") {
    throw new HttpException("Not a text post", 400);
  }
  if (props.body.body !== undefined) {
    await MyGlobal.prisma.reddit_clone_post_text_contents.update({
      where: { reddit_clone_post_id: props.postId },
      data: { body: props.body.body },
    });
  }
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: { id: props.postId },
    data: { updated_at: new Date() },
  });
  const updated = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      reddit_clone_community_id: true,
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
          created_at: true,
          updated_at: true,
          deleted_at: true,
          member: {
            select: {
              id: true,
              username: true,
            },
          },
          communityIcons: {
            select: {
              id: true,
            },
          },
        },
      },
      postTextContent: {
        select: {
          id: true,
          body: true,
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
                  created_at: true,
                  member: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      link: true,
      image: true,
    },
  });
  return {
    id: updated.id,
    title: updated.title,
    type: updated.type,
    author: {
      id: updated.author.id,
      username: updated.author.username,
    },
    community: {
      id: updated.community.id,
      name: updated.community.name,
      description: updated.community.description,
      subscriberCount: updated.community.subscriber_count,
      owner: {
        id: updated.community.member.id,
        username: updated.community.member.username,
      },
      icon: null,
    },
    textContent: {
      id: updated.postTextContent!.id,
      body: updated.postTextContent!.body,
      post: {
        id: updated.postTextContent!.post.id,
        title: updated.postTextContent!.post.title,
        type: updated.postTextContent!.post.type as "text" | "link" | "image",
        voteScore: updated.postTextContent!.post.vote_score,
        commentCount: updated.postTextContent!.post.comment_count,
        createdAt: updated.postTextContent!.post.created_at.toISOString(),
        author: {
          id: updated.postTextContent!.post.author.id,
          username: updated.postTextContent!.post.author.username,
        },
        community: {
          id: updated.postTextContent!.post.community.id,
          name: updated.postTextContent!.post.community.name,
          description: updated.postTextContent!.post.community.description,
          subscriberCount:
            updated.postTextContent!.post.community.subscriber_count,
          owner: {
            id: updated.postTextContent!.post.community.member.id,
            username: updated.postTextContent!.post.community.member.username,
          },
        },
        contentPreview: "",
      },
    },
    link: null,
    image: null,
    voteScore: updated.vote_score,
    commentCount: updated.comment_count,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    deletedAt:
      updated.deleted_at !== null ? updated.deleted_at.toISOString() : null,
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
// import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
// import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberPostsPostIdTextContent(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostTextContent.IUpdate;
// }): Promise<IRedditClonePost> {
//   await MyGlobal.prisma.reddit_clone_posts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
//     where: { ... },
//     ...RedditClonePostTransformer.select(),
//   });
//   return await RedditClonePostTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------