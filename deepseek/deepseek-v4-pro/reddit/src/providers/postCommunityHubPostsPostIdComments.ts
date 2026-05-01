import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommentCollector } from "../collectors/CommunityHubCommentCollector";
import { CommunityHubCommentTransformer } from "../transformers/CommunityHubCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityHubComment.ICreate;
}): Promise<ICommunityHubComment> {
  await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const record = await MyGlobal.prisma.community_hub_comments.create({
    data: await CommunityHubCommentCollector.collect({
      body: props.body,
      communityHubPosts: { id: props.postId } as IEntity,
      communityHubComments: null!,
      communityHubMembers: null!,
      communityHubMemberSessions: null!,
    }),
    ...CommunityHubCommentTransformer.select(),
  });
  await MyGlobal.prisma.community_hub_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: {
        increment: 1,
      },
    },
  });
  return await CommunityHubCommentTransformer.transform(record);
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
// import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubPostsPostIdComments(props: {
//   postId: string & tags.Format<"uuid">;
//   body: ICommunityHubComment.ICreate;
// }): Promise<ICommunityHubComment> {
//   const record = await MyGlobal.prisma.community_hub_comments.create({
//     data: await CommunityHubCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityHubCommentTransformer.select(),
//   });
//   return await CommunityHubCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------