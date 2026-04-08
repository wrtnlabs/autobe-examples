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
import { RedditClonePostCollector } from "../collectors/RedditClonePostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPosts(props: {
  member: MemberPayload;
  body: IRedditClonePost.ICreate;
}): Promise<IRedditClonePost> {
  const subscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: props.body.communityId,
      },
      select: { id: true },
    });
  if (!subscription) {
    throw new HttpException(
      "You must be subscribed to the community to create a post",
      403,
    );
  }
  const postData = await RedditClonePostCollector.collect({
    body: props.body,
    redditCloneMembers: { id: props.member.id },
    redditCloneMemberSessions: { id: props.member.session_id },
  });
  const created = await MyGlobal.prisma.reddit_clone_posts.create({
    data: postData,
  });
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: created.id },
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
      link: {
        select: {
          id: true,
          url: true,
          created_at: true,
          updated_at: true,
        },
      },
      image: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          file: {
            select: {
              id: true,
              original_filename: true,
              stored_filename: true,
              mime_type: true,
              file_size: true,
              storage_path: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              uploader: {
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
  });
  const authorSummary: IRedditCloneMember.ISummary = {
    id: post.author.id,
    username: post.author.username,
  };
  const communitySummary: IRedditCloneCommunity.ISummary = {
    id: post.community.id,
    name: post.community.name,
    description: post.community.description,
    subscriberCount: post.community.subscriber_count,
    owner: {
      id: post.community.member.id,
      username: post.community.member.username,
    },
    icon: post.community.icon?.file?.storage_path ?? null,
  };
  return {
    id: post.id,
    title: post.title,
    type: post.type,
    author: authorSummary,
    community: communitySummary,
    textContent: post.postTextContent
      ? {
          id: post.postTextContent.id,
          body: post.postTextContent.body,
          post: {
            id: post.postTextContent.post.id,
            title: post.postTextContent.post.title,
            type: post.postTextContent.post.type as "text" | "link" | "image",
            voteScore: post.postTextContent.post.vote_score,
            commentCount: post.postTextContent.post.comment_count,
            createdAt: post.postTextContent.post.created_at.toISOString(),
            author: {
              id: post.postTextContent.post.author.id,
              username: post.postTextContent.post.author.username,
            },
            community: {
              id: post.postTextContent.post.community.id,
              name: post.postTextContent.post.community.name,
              description: post.postTextContent.post.community.description,
              subscriberCount:
                post.postTextContent.post.community.subscriber_count,
              owner: {
                id: post.postTextContent.post.community.member.id,
                username: post.postTextContent.post.community.member.username,
              },
              icon: null,
            },
            contentPreview: "",
          },
        }
      : {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          body: "",
          post: {
            id: post.id,
            title: post.title,
            type: post.type as "text" | "link" | "image",
            voteScore: post.vote_score,
            commentCount: post.comment_count,
            createdAt: post.created_at.toISOString(),
            author: authorSummary,
            community: communitySummary,
            contentPreview: "",
          },
        },
    link: post.link
      ? {
          id: post.link.id,
          url: post.link.url,
          created_at: post.link.created_at.toISOString(),
          updated_at: post.link.updated_at.toISOString(),
          post: {
            id: post.id,
            title: post.title,
            type: post.type as "text" | "link" | "image",
            voteScore: post.vote_score,
            commentCount: post.comment_count,
            createdAt: post.created_at.toISOString(),
            author: authorSummary,
            community: communitySummary,
            contentPreview: "",
          },
        }
      : {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          url: "" as string & tags.Format<"uri">,
          created_at: post.created_at.toISOString(),
          updated_at: post.updated_at.toISOString(),
          post: {
            id: post.id,
            title: post.title,
            type: post.type as "text" | "link" | "image",
            voteScore: post.vote_score,
            commentCount: post.comment_count,
            createdAt: post.created_at.toISOString(),
            author: authorSummary,
            community: communitySummary,
            contentPreview: "",
          },
        },
    image: post.image
      ? {
          id: post.image.id,
          file: {
            id: post.image.file.id,
            originalFilename: post.image.file.original_filename,
            storedFilename: post.image.file.stored_filename,
            mimeType: post.image.file.mime_type,
            fileSize: post.image.file.file_size,
            storagePath: post.image.file.storage_path,
            status: post.image.file.status,
            createdAt: post.image.file.created_at.toISOString(),
            updatedAt: post.image.file.updated_at.toISOString(),
            deletedAt: post.image.file.deleted_at?.toISOString() ?? null,
            uploader: {
              id: post.image.file.uploader.id,
              username: post.image.file.uploader.username,
            },
            thumbnails: [],
            scans: [],
            associations: [],
          },
          created_at: post.image.created_at.toISOString(),
          updated_at: post.image.updated_at.toISOString(),
        }
      : {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          file: {
            id: "00000000-0000-0000-0000-000000000000" as string &
              tags.Format<"uuid">,
            originalFilename: "",
            storedFilename: "",
            mimeType: "",
            fileSize: 0,
            storagePath: "",
            status: "",
            createdAt: post.created_at.toISOString(),
            updatedAt: post.updated_at.toISOString(),
            deletedAt: null,
            uploader: authorSummary,
            thumbnails: [],
            scans: [],
            associations: [],
          },
          created_at: post.created_at.toISOString(),
          updated_at: post.updated_at.toISOString(),
        },
    voteScore: post.vote_score,
    commentCount: post.comment_count,
    createdAt: post.created_at.toISOString(),
    updatedAt: post.updated_at.toISOString(),
    deletedAt: post.deleted_at?.toISOString() ?? null,
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
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
// import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
// import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberPosts(props: {
//   member: MemberPayload;
//   body: IRedditClonePost.ICreate;
// }): Promise<IRedditClonePost> {
//   const record = await MyGlobal.prisma.reddit_clone_posts.create({
//     data: await RedditClonePostCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditClonePostTransformer.select(),
//   });
//   return await RedditClonePostTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------