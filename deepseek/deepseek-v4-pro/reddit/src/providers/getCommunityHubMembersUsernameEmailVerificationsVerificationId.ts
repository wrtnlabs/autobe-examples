import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubMemberEmailVerificationTransformer } from "../transformers/CommunityHubMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityHubMembersUsernameEmailVerificationsVerificationId(props: {
  username: string;
  verificationId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubMemberEmailVerification> {
  const member = await MyGlobal.prisma.community_hub_members.findUniqueOrThrow({
    where: { username: props.username },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const verification =
    await MyGlobal.prisma.community_hub_member_email_verifications.findFirstOrThrow(
      {
        where: {
          id: props.verificationId,
          community_hub_member_id: member.id,
        },
        ...CommunityHubMemberEmailVerificationTransformer.select(),
      },
    );
  return await CommunityHubMemberEmailVerificationTransformer.transform(
    verification,
  );
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
// import { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityHubMembersUsernameEmailVerificationsVerificationId(props: {
//   username: string;
//   verificationId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubMemberEmailVerification> {
//   const record = await MyGlobal.prisma.community_hub_member_email_verifications.findFirstOrThrow({
//     ...CommunityHubMemberEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------