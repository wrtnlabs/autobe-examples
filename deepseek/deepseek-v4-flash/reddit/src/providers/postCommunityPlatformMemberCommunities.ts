import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityCollector } from "../collectors/CommunityPlatformCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Validate community name uniqueness
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Community name is already taken", 409);
  }
  // Create community with collector + transformer
  const record = await MyGlobal.prisma.community_platform_communities.create({
    data: await CommunityPlatformCommunityCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityPlatformCommunityTransformer.select(),
  });
  return await CommunityPlatformCommunityTransformer.transform(record);
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
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberCommunities(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformCommunity.ICreate;
// }): Promise<ICommunityPlatformCommunity> {
//   const record = await MyGlobal.prisma.community_platform_communities.create({
//     data: await CommunityPlatformCommunityCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformCommunityTransformer.select(),
//   });
//   return await CommunityPlatformCommunityTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------