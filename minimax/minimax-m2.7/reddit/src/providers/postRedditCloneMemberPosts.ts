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
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPosts(props: {
  member: MemberPayload;
  body: IRedditClonePost.ICreate;
}): Promise<IRedditClonePost> {
  // Validate member subscription to target community
  const subscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: props.body.communityId,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "You must be subscribed to the community to create a post",
      403,
    );
  }
  // Validate type-specific requirements
  if (props.body.type === "text" && !props.body.body) {
    throw new HttpException("Body is required for text posts", 400);
  }
  if (props.body.type === "link" && !props.body.url) {
    throw new HttpException("URL is required for link posts", 400);
  }
  if (props.body.type === "image") {
    if (!props.body.fileId) {
      throw new HttpException("File ID is required for image posts", 400);
    }
    const file = await MyGlobal.prisma.reddit_clone_files.findFirst({
      where: {
        id: props.body.fileId,
        status: "processed",
        deleted_at: null,
      },
    });
    if (!file) {
      throw new HttpException(
        "Uploaded image file not found or not processed",
        400,
      );
    }
  }
  // Get member entity for collector
  const memberEntity =
    await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { id: true },
    });
  // Get session entity for collector
  const sessionEntity =
    await MyGlobal.prisma.reddit_clone_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { id: true },
    });
  // Collect data using collector
  const collectedData = await RedditClonePostCollector.collect({
    body: props.body,
    redditCloneMembers: memberEntity,
    redditCloneMemberSessions: sessionEntity,
  });
  // Create post with collected data
  const record = await MyGlobal.prisma.reddit_clone_posts.create({
    data: collectedData,
    ...RedditClonePostTransformer.select(),
  });
  // Transform and return
  return await RedditClonePostTransformer.transform(record);
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