import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmMemberSessionTransformer } from "../transformers/HrmMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmMemberSession> {
  const record = await MyGlobal.prisma.hrm_member_sessions.findFirstOrThrow({
    ...HrmMemberSessionTransformer.select(),
    where: {
      id: props.sessionId,
      hrm_member_id: props.member.id,
    },
  });
  return await HrmMemberSessionTransformer.transform(record);
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
// import { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberMemberSessionsSessionId(props: {
//   member: MemberPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IHrmMemberSession> {
//   const record = await MyGlobal.prisma.hrm_member_sessions.findFirstOrThrow({
//     ...HrmMemberSessionTransformer.select(),
//     where: { ... },
//   });
//   return await HrmMemberSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------