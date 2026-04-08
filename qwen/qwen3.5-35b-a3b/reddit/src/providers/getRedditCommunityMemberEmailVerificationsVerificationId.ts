import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityMemberEmailVerificationTransformer } from "../transformers/RedditCommunityMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.reddit_community_member_email_verifications.findFirstOrThrow(
      {
        ...RedditCommunityMemberEmailVerificationTransformer.select(),
        where: {
          id: props.verificationId,
          deleted_at: null,
        },
      },
    );
  return await RedditCommunityMemberEmailVerificationTransformer.transform(
    record,
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
// import { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberEmailVerificationsVerificationId(props: {
//   member: MemberPayload;
//   verificationId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityMemberEmailVerification> {
//   const record = await MyGlobal.prisma.reddit_community_member_email_verifications.findFirstOrThrow({
//     ...RedditCommunityMemberEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------