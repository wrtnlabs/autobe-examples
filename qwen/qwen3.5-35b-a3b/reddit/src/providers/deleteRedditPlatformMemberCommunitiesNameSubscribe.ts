import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditPlatformMemberCommunitiesNameSubscribe(props: {
  member: MemberPayload;
  name: string;
}): Promise<void> {
  // 1. Find community by name (must exist and not deleted)
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        name: props.name,
        deleted_at: null,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Find active subscription record
  const subscription =
    await MyGlobal.prisma.reddit_platform_subscriptions.findFirst({
      where: {
        user_id: props.member.id,
        community_id: community.id,
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }
  // 3. Soft delete by setting deleted_at
  await MyGlobal.prisma.reddit_platform_subscriptions.update({
    where: { id: subscription.id },
    data: {
      deleted_at: new Date(),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditPlatformMemberCommunitiesNameSubscribe(props: {
//   member: MemberPayload;
//   name: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------