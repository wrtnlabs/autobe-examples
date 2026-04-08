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

export async function postRedditCommunityMemberCommunitiesCommunityIdDeleteConfirmation(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity.ISummary> {
  const record =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? undefined,
    subscriber_count: 0,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  } satisfies IRedditCommunityCommunity.ISummary;
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
// export async function postRedditCommunityMemberCommunitiesCommunityIdDeleteConfirmation(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityCommunity.ISummary> {
//   const record = await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
//     ...RedditCommunityCommunityAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityCommunityAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------