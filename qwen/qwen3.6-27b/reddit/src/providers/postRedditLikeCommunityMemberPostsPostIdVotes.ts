import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityPostVoteCollector } from "../collectors/RedditLikeCommunityPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityPostVoteTransformer } from "../transformers/RedditLikeCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityPostVote.ICreate;
}): Promise<IRedditLikeCommunityPostVote> {
  await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const record = await MyGlobal.prisma.reddit_like_community_post_votes.upsert({
    where: {
      reddit_like_community_member_id_reddit_like_community_post_id: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_post_id: props.postId,
      },
    },
    create: await RedditLikeCommunityPostVoteCollector.collect({
      body: props.body,
      member: props.member,
      post: { id: props.postId },
    }),
    update: {
      direction: props.body.direction,
      updated_at: new Date(),
    },
    ...RedditLikeCommunityPostVoteTransformer.select(),
  });
  return await RedditLikeCommunityPostVoteTransformer.transform(record);
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
// import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberPostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditLikeCommunityPostVote.ICreate;
// }): Promise<IRedditLikeCommunityPostVote> {
//   const record = await MyGlobal.prisma.reddit_like_community_post_votes.create({
//     data: await RedditLikeCommunityPostVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditLikeCommunityPostVoteTransformer.select(),
//   });
//   return await RedditLikeCommunityPostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------