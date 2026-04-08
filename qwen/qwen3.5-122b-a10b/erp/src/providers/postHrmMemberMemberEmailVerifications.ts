import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmMemberEmailVerificationCollector } from "../collectors/HrmMemberEmailVerificationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmMemberEmailVerificationTransformer } from "../transformers/HrmMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmMemberEmailVerification.ICreate;
}): Promise<IHrmMemberEmailVerification> {
  // 1. Rate limiting: Check for too many recent requests (max 3 per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount =
    await MyGlobal.prisma.hrm_member_email_verifications.count({
      where: {
        hrm_member_id: props.member.id,
        created_at: { gte: oneHourAgo },
        deleted_at: null,
      },
    });
  if (recentCount >= 3) {
    throw new HttpException("Too many verification requests", 400);
  }
  // 2. Validate member exists and is active (not soft-deleted)
  await MyGlobal.prisma.hrm_members.findFirstOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  // 3. Invalidate previous unused tokens for this member
  const now = new Date();
  await MyGlobal.prisma.hrm_member_email_verifications.updateMany({
    where: {
      hrm_member_id: props.member.id,
      used_at: null,
      deleted_at: null,
    },
    data: {
      used_at: now,
      updated_at: now,
    },
  });
  // 4. Create new verification record using collector
  const record = await MyGlobal.prisma.hrm_member_email_verifications.create({
    data: await HrmMemberEmailVerificationCollector.collect({
      body: props.body,
      hrmMembers: { id: props.member.id },
    }),
    ...HrmMemberEmailVerificationTransformer.select(),
  });
  // 5. Return transformed response
  return await HrmMemberEmailVerificationTransformer.transform(record);
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
// import { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IHrmMemberEmailVerification.ICreate;
// }): Promise<IHrmMemberEmailVerification> {
//   const record = await MyGlobal.prisma.hrm_member_email_verifications.create({
//     data: await HrmMemberEmailVerificationCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmMemberEmailVerificationTransformer.select(),
//   });
//   return await HrmMemberEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------