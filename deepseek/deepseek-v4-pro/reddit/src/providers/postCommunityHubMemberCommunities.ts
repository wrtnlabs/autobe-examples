import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommunityCollector } from "../collectors/CommunityHubCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubCommunityTransformer } from "../transformers/CommunityHubCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityHubCommunity.ICreate;
}): Promise<ICommunityHubCommunity> {
  if (
    props.body.description === null ||
    props.body.description.trim().length === 0
  ) {
    throw new HttpException("A description is required", 422);
  }
  const existingCommunity =
    await MyGlobal.prisma.community_hub_communities.findFirst({
      where: {
        name: {
          equals: props.body.name,
          mode: "insensitive",
        },
        deleted_at: null,
      },
    });
  if (existingCommunity !== null) {
    throw new HttpException("Community name is already taken", 409);
  }
  const record = await MyGlobal.prisma.community_hub_communities.create({
    data: await CommunityHubCommunityCollector.collect({
      body: props.body,
      communityHubMembers: { id: props.member.id },
      communityHubMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityHubCommunityTransformer.select(),
  });
  return await CommunityHubCommunityTransformer.transform(record);
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
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubMemberCommunities(props: {
//   member: MemberPayload;
//   body: ICommunityHubCommunity.ICreate;
// }): Promise<ICommunityHubCommunity> {
//   const record = await MyGlobal.prisma.community_hub_communities.create({
//     data: await CommunityHubCommunityCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityHubCommunityTransformer.select(),
//   });
//   return await CommunityHubCommunityTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------