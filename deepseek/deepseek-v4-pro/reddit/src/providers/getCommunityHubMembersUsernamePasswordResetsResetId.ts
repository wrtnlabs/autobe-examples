import { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubMemberPasswordResetTransformer } from "../transformers/CommunityHubMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityHubMembersUsernamePasswordResetsResetId(props: {
  username: string;
  resetId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubMemberPasswordReset> {
  const member = await MyGlobal.prisma.community_hub_members.findFirstOrThrow({
    where: {
      username: props.username,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const record =
    await MyGlobal.prisma.community_hub_member_password_resets.findFirstOrThrow(
      {
        where: {
          id: props.resetId,
          community_hub_member_id: member.id,
        },
        ...CommunityHubMemberPasswordResetTransformer.select(),
      },
    );
  return await CommunityHubMemberPasswordResetTransformer.transform(record);
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
// import { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityHubMembersUsernamePasswordResetsResetId(props: {
//   username: string;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubMemberPasswordReset> {
//   const record = await MyGlobal.prisma.community_hub_member_password_resets.findFirstOrThrow({
//     ...CommunityHubMemberPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubMemberPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------