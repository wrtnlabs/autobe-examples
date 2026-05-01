import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubPostTransformer } from "../transformers/CommunityHubPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubCommunitiesCommunityNamePosts(props: {
  communityName: string;
  body: ICommunityHubPost.ICreate;
}): Promise<ICommunityHubPost> {
  const community =
    await MyGlobal.prisma.community_hub_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  const now = new Date().toISOString();
  const created = await MyGlobal.prisma.community_hub_posts.create({
    data: {
      id: v4(),
      type: props.body.type,
      title: props.body.title,
      body: props.body.body ?? null,
      url: props.body.url ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: {
          id: "00000000-0000-0000-0000-000000000000",
        },
      },
      community: {
        connect: { id: community.id },
      },
      image:
        props.body.type === "image" && props.body.image
          ? {
              create: {
                id: v4(),
                original_path: props.body.image.file,
                thumbnail_path: props.body.image.file.replace(
                  /(\.[^.]+)$/,
                  "_thumb$1",
                ),
                byte_size: 0,
                width: 0,
                height: 0,
                mime_type: "",
                created_at: now,
                updated_at: now,
                deleted_at: null,
              },
            }
          : undefined,
      comments: undefined,
    },
    ...CommunityHubPostTransformer.select(),
  });
  return await CommunityHubPostTransformer.transform(created);
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
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubCommunitiesCommunityNamePosts(props: {
//   communityName: string;
//   body: ICommunityHubPost.ICreate;
// }): Promise<ICommunityHubPost> {
//   const record = await MyGlobal.prisma.community_hub_posts.create({
//     data: await CommunityHubPostCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityHubPostTransformer.select(),
//   });
//   return await CommunityHubPostTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------