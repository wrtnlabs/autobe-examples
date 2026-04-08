import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostVoteTransformer } from "../transformers/RedditCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostVote> {
  const record =
    await MyGlobal.prisma.reddit_community_post_votes.findFirstOrThrow({
      ...RedditCommunityPostVoteTransformer.select(),
      where: {
        id: props.voteId,
        deleted_at: null,
      },
    });
  if (record.post.id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  return await RedditCommunityPostVoteTransformer.transform(record);
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
// import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberPostsPostIdVotesVoteId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityPostVote> {
//   const record = await MyGlobal.prisma.reddit_community_post_votes.findFirstOrThrow({
//     ...RedditCommunityPostVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityPostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------