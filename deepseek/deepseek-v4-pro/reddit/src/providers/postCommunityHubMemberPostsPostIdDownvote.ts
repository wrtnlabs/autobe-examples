import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubVoteTransformer } from "../transformers/CommunityHubVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberPostsPostIdDownvote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubVote> {
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_hub_posts.findUniqueOrThrow({
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_hub_member_id: true,
      },
    });
    const existingVote = await tx.community_hub_votes.findFirst({
      where: {
        member_id: props.member.id,
        target_type: "post",
        target_id: props.postId,
      },
      ...CommunityHubVoteTransformer.select(),
    });
    if (existingVote !== null) {
      if (existingVote.value === -1) {
        return existingVote;
      }
      await tx.community_hub_votes.update({
        where: { id: existingVote.id },
        data: {
          value: -1,
          updated_at: new Date().toISOString(),
        },
      });
      await tx.community_hub_posts.update({
        where: { id: props.postId },
        data: { vote_score: { decrement: 2 } },
      });
      await tx.community_hub_members.update({
        where: { id: post.community_hub_member_id },
        data: { karma: { decrement: 2 } },
      });
    } else {
      const now = new Date().toISOString();
      await tx.community_hub_votes.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          target_type: "post",
          target_id: props.postId,
          value: -1,
          created_at: now,
          updated_at: now,
        },
      });
      await tx.community_hub_posts.update({
        where: { id: props.postId },
        data: { vote_score: { decrement: 1 } },
      });
      await tx.community_hub_members.update({
        where: { id: post.community_hub_member_id },
        data: { karma: { decrement: 1 } },
      });
    }
    const finalVote = await tx.community_hub_votes.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        target_type: "post",
        target_id: props.postId,
      },
      ...CommunityHubVoteTransformer.select(),
    });
    return finalVote;
  });
  return await CommunityHubVoteTransformer.transform(result);
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
// import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubMemberPostsPostIdDownvote(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubVote> {
//   const record = await MyGlobal.prisma.community_hub_votes.findFirstOrThrow({
//     ...CommunityHubVoteTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------