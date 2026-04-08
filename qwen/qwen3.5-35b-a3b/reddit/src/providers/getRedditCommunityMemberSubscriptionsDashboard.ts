import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberSubscriptionsDashboard(props: {
  member: MemberPayload;
}): Promise<IRedditCommunitySubscription.ISummary> {
  const record =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirstOrThrow({
      ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
      where: {
        reddit_community_member_id: props.member.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  return await RedditCommunitySubscriptionAtSummaryTransformer.transform(
    record,
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
// import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberSubscriptionsDashboard(props: {
//   member: MemberPayload;
// }): Promise<IRedditCommunitySubscription.ISummary> {
//   const record = await MyGlobal.prisma.reddit_community_subscriptions.findFirstOrThrow({
//     ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunitySubscriptionAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------