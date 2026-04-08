import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneUserProfileAtInvertTransformer } from "../transformers/RedditCloneUserProfileAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneUsersUsernameProfile(props: {
  username: string;
}): Promise<IRedditCloneUserProfile.IInvert> {
  // Step 1: Find member by username (must exist and not soft-deleted)
  const member = await MyGlobal.prisma.reddit_clone_members.findFirstOrThrow({
    where: {
      username: props.username,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
    },
  });
  // Step 2: Query posts authored by member where not soft-deleted
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: {
      reddit_clone_member_id: member.id,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          subscriber_count: true,
        },
      },
    },
  });
  // Step 3: Query comments authored by member where not soft-deleted
  const comments = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: {
      reddit_clone_member_id: member.id,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      member: {
        select: { id: true, username: true },
      },
    },
  });
  // Step 4: Query profile with avatar and member data using transformer select
  const profile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findFirstOrThrow({
      where: { reddit_clone_member_id: member.id },
      ...RedditCloneUserProfileAtInvertTransformer.select(),
    });
  // Step 5: Override member posts and comments with filtered data
  const transformedProfile: RedditCloneUserProfileAtInvertTransformer.Payload =
    {
      ...profile,
      avatarFileAssociation: profile.avatarFileAssociation,
      member: {
        ...profile.member,
        posts: posts.map(
          (
            p,
          ): RedditCloneUserProfileAtInvertTransformer.Payload["member"]["posts"][number] => ({
            id: p.id,
            title: p.title,
            type: p.type as "text" | "link" | "image",
            vote_score: p.vote_score,
            comment_count: p.comment_count,
            created_at: p.created_at,
            community: {
              id: p.community.id,
              name: p.community.name,
              description: p.community.description,
              subscriber_count: p.community.subscriber_count,
            },
          }),
        ),
        comments: comments.map(
          (
            c,
          ): RedditCloneUserProfileAtInvertTransformer.Payload["member"]["comments"][number] => ({
            id: c.id,
            content: c.content,
            vote_score: c.vote_score,
            created_at: c.created_at,
            member: {
              id: c.member.id,
              username: c.member.username,
            },
          }),
        ),
      },
    };
  // Step 6: Return transformed response
  return await RedditCloneUserProfileAtInvertTransformer.transform(
    transformedProfile,
  );
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
// import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneUsersUsernameProfile(props: {
//   username: string;
// }): Promise<IRedditCloneUserProfile.IInvert> {
//   const record = await MyGlobal.prisma.reddit_clone_user_profiles.findFirstOrThrow({
//     ...RedditCloneUserProfileAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneUserProfileAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------