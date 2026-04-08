import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityAdminCommunitiesCommunityId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunity.IUpdate;
}): Promise<IRedditCommunityCommunity> {
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  const hasPermission =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_community_id: props.communityId,
        reddit_community_member_id: props.admin.id,
        role: {
          in: ["owner", "moderator"],
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    if (props.body.name.trim().length === 0) {
      throw new HttpException("Community name cannot be empty", 400);
    }
    const existing =
      await MyGlobal.prisma.reddit_community_communities.findFirst({
        where: {
          name: props.body.name,
          id: {
            not: props.communityId,
          },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existing !== null) {
      throw new HttpException("Community name already exists", 400);
    }
  }
  await MyGlobal.prisma.reddit_community_communities.update({
    where: {
      id: props.communityId,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
      },
      ...RedditCommunityCommunityTransformer.select(),
    });
  return await RedditCommunityCommunityTransformer.transform(updated);
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
// export async function putRedditCommunityAdminCommunitiesCommunityId(props: {
//   admin: AdminPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCommunityCommunity.IUpdate;
// }): Promise<IRedditCommunityCommunity> {
//   await MyGlobal.prisma.reddit_community_communities.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCommunityCommunityTransformer.select(),
//   });
//   return await RedditCommunityCommunityTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------