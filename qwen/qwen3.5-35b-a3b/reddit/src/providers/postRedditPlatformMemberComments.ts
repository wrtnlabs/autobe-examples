import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentCollector } from "../collectors/RedditPlatformCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentTransformer } from "../transformers/RedditPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberComments(props: {
  member: MemberPayload;
  body: IRedditPlatformComment.ICreate;
}): Promise<IRedditPlatformComment> {
  // 1. Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: props.body.reddit_platform_post_id,
      deleted_at: null,
    },
    select: {
      id: true,
      community: {
        select: {
          id: true,
        },
      },
    },
  });
  // 2. Check if member is banned from the community
  const banRecord =
    await MyGlobal.prisma.reddit_platform_banned_users.findFirst({
      where: {
        community: {
          id: post.community.id,
        },
        user: {
          id: props.member.id,
        },
        deleted_at: null,
      },
    });
  if (banRecord !== null) {
    throw new HttpException("Ban violation", 403);
  }
  // 3. Validate parent comment if provided
  if (
    props.body.reddit_platform_comments_id !== undefined &&
    props.body.reddit_platform_comments_id !== null
  ) {
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: {
        id: props.body.reddit_platform_comments_id,
        deleted_at: null,
      },
    });
  }
  // 4. Create the comment
  const created = await MyGlobal.prisma.reddit_platform_comments.create({
    data: await RedditPlatformCommentCollector.collect({
      body: props.body,
      redditPlatformMembers: {
        id: props.member.id,
      } satisfies IEntity,
    }),
    ...RedditPlatformCommentTransformer.select(),
  });
  // 5. Update parent comment's comment_count if this is a reply
  if (
    props.body.reddit_platform_comments_id !== undefined &&
    props.body.reddit_platform_comments_id !== null
  ) {
    await MyGlobal.prisma.reddit_platform_comments.update({
      where: {
        id: props.body.reddit_platform_comments_id,
      },
      data: {
        comment_count: {
          increment: 1,
        },
      },
    });
  }
  // 6. Return the created comment
  return await RedditPlatformCommentTransformer.transform(created);
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
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberComments(props: {
//   member: MemberPayload;
//   body: IRedditPlatformComment.ICreate;
// }): Promise<IRedditPlatformComment> {
//   const record = await MyGlobal.prisma.reddit_platform_comments.create({
//     data: await RedditPlatformCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformCommentTransformer.select(),
//   });
//   return await RedditPlatformCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------