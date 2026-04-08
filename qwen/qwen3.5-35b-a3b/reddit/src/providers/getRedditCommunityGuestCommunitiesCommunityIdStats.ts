import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityGuestCommunitiesCommunityIdStats(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity.IAt> {
  // Verify community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        created_at: true,
      },
    });
  // Count active subscriptions for subscriber_count
  const subscriber_count =
    await MyGlobal.prisma.reddit_community_subscriptions.count({
      where: {
        reddit_community_communities_id: props.communityId,
        status: "active",
        deleted_at: null,
      },
    });
  // Fetch all active posts to calculate metrics
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: {
      reddit_community_community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      comment_count: true,
      vote_score: true,
    },
  });
  // Aggregate post metrics
  const post_count = posts.length;
  const comment_count = posts.reduce(
    (sum, post) => sum + (post.comment_count ?? 0),
    0,
  );
  const vote_count = posts.reduce(
    (sum, post) => sum + Math.abs(post.vote_score ?? 0),
    0,
  );
  // Return statistics with proper date formatting
  return {
    subscriber_count,
    post_count,
    comment_count,
    vote_count,
    created_at: toISOStringSafe(community.created_at),
    name: community.name,
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
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityGuestCommunitiesCommunityIdStats(props: {
//   guest: GuestPayload;
//   communityId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityCommunity.IAt> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------