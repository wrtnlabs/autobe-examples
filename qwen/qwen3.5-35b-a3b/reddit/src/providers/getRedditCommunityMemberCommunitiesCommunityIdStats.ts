import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
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

export async function getRedditCommunityMemberCommunitiesCommunityIdStats(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity.IAt> {
  // Verify community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, name: true, created_at: true },
    });
  // Count active subscriptions
  const activeSubscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.count({
      where: {
        reddit_community_communities_id: props.communityId,
        status: "active",
        deleted_at: null,
      },
    });
  // Get post statistics
  const postsStats = await MyGlobal.prisma.reddit_community_posts.aggregate({
    where: {
      reddit_community_community_id: props.communityId,
      deleted_at: null,
    },
    _count: true,
    _sum: {
      comment_count: true,
      vote_score: true,
    },
  });
  // Calculate total vote engagement as sum of absolute vote scores
  const totalVoteScore = postsStats._sum.vote_score ?? 0;
  const voteCount = Math.abs(totalVoteScore);
  return {
    subscriber_count: activeSubscriptions,
    post_count: postsStats._count,
    comment_count: postsStats._sum.comment_count ?? 0,
    vote_count: voteCount,
    created_at: community.created_at.toISOString(),
    name: community.name,
  } satisfies IRedditCommunityCommunity.IAt;
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
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberCommunitiesCommunityIdStats(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityCommunity.IAt> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------