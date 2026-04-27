import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberEmailVerificationTransformer } from "../transformers/CommunityPlatformMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberEmailVerifications(props: {
  member: MemberPayload;
  body: ICommunityPlatformMemberEmailVerification.IVerify;
}): Promise<ICommunityPlatformMemberEmailVerification> {
  // Hash the raw token using SHA-256 for secure comparison with stored hash
  const crypto = require("crypto");
  const hashedToken = crypto
    .createHash("sha256")
    .update(props.body.token)
    .digest("hex");
  // Find the matching verification record by hashed token
  const record =
    await MyGlobal.prisma.community_platform_member_email_verifications.findFirst(
      {
        where: { token: hashedToken },
        ...CommunityPlatformMemberEmailVerificationTransformer.select(),
      },
    );
  // If no matching token found, return 404 Not Found
  if (record === null) {
    throw new HttpException("Not Found", 404);
  }
  // If token has expired (expired_at is in the past), return 410 Gone
  if (record.expired_at.getTime() < Date.now()) {
    throw new HttpException("Gone", 410);
  }
  // If token has already been consumed (verified_at is set), return 409 Conflict
  if (record.verified_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  // Update the record
  const now = new Date();
  await MyGlobal.prisma.community_platform_member_email_verifications.update({
    where: { id: record.id },
    data: {
      verified_at: now,
      updated_at: now,
    },
  });
  // Fetch the updated record for response
  const updated =
    await MyGlobal.prisma.community_platform_member_email_verifications.findUniqueOrThrow(
      {
        where: { id: record.id },
        ...CommunityPlatformMemberEmailVerificationTransformer.select(),
      },
    );
  return await CommunityPlatformMemberEmailVerificationTransformer.transform(
    updated,
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
// import { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformMemberEmailVerification.IVerify;
// }): Promise<ICommunityPlatformMemberEmailVerification> {
//   const record = await MyGlobal.prisma.community_platform_member_email_verifications.findFirstOrThrow({
//     ...CommunityPlatformMemberEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------