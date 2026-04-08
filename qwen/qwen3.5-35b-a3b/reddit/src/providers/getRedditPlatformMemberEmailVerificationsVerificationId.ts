import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberEmailVerificationTransformer } from "../transformers/RedditPlatformMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.reddit_platform_member_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.verificationId },
        ...RedditPlatformMemberEmailVerificationTransformer.select(),
      },
    );
  return await RedditPlatformMemberEmailVerificationTransformer.transform(
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
// import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberEmailVerificationsVerificationId(props: {
//   member: MemberPayload;
//   verificationId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformMemberEmailVerification> {
//   const record = await MyGlobal.prisma.reddit_platform_member_email_verifications.findFirstOrThrow({
//     ...RedditPlatformMemberEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------