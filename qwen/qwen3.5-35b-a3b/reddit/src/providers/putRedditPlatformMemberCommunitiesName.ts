import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityTransformer } from "../transformers/RedditPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberCommunitiesName(props: {
  member: MemberPayload;
  name: string;
  body: IRedditPlatformCommunity.IUpdate;
}): Promise<IRedditPlatformCommunity> {
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        name: props.name,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
        description: true,
        icon_url: true,
        deleted_at: true,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Not Found", 404);
  }
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_platform_communities.update({
    where: { id: community.id },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: community.id },
      ...RedditPlatformCommunityTransformer.select(),
    });
  return await RedditPlatformCommunityTransformer.transform(updated);
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
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditPlatformMemberCommunitiesName(props: {
//   member: MemberPayload;
//   name: string;
//   body: IRedditPlatformCommunity.IUpdate;
// }): Promise<IRedditPlatformCommunity> {
//   await MyGlobal.prisma.reddit_platform_communities.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
//     where: { ... },
//     ...RedditPlatformCommunityTransformer.select(),
//   });
//   return await RedditPlatformCommunityTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------