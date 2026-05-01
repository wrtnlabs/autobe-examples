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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubMemberTransformer } from "../transformers/CommunityHubMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityHubMember.IUpdate;
}): Promise<ICommunityHubMember> {
  const hasUpdates =
    props.body.display_name !== undefined ||
    props.body.bio !== undefined ||
    props.body.avatar_uri !== undefined;
  if (!hasUpdates) {
    const member = await MyGlobal.prisma.community_hub_members.findFirstOrThrow(
      {
        where: { id: props.member.id, deleted_at: null },
        ...CommunityHubMemberTransformer.select(),
      },
    );
    return await CommunityHubMemberTransformer.transform(member);
  }
  await MyGlobal.prisma.community_hub_members.update({
    where: { id: props.member.id },
    data: {
      updated_at: new Date(),
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.avatar_uri !== undefined && {
        avatar_uri: props.body.avatar_uri,
      }),
    },
  });
  const updated = await MyGlobal.prisma.community_hub_members.findFirstOrThrow({
    where: { id: props.member.id },
    ...CommunityHubMemberTransformer.select(),
  });
  return await CommunityHubMemberTransformer.transform(updated);
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
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubMemberProfile(props: {
//   member: MemberPayload;
//   body: ICommunityHubMember.IUpdate;
// }): Promise<ICommunityHubMember> {
//   const record = await MyGlobal.prisma.community_hub_members.findFirstOrThrow({
//     ...CommunityHubMemberTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------