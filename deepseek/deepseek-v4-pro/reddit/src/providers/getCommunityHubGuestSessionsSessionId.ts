import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityHubMemberSessionTransformer } from "../transformers/CommunityHubMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityHubGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubMemberSession> {
  const record =
    await MyGlobal.prisma.community_hub_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        ...CommunityHubMemberSessionTransformer.select().select,
        community_hub_member_id: true,
      },
    });
  if (record.community_hub_member_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityHubMemberSessionTransformer.transform(record);
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
// import { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityHubGuestSessionsSessionId(props: {
//   guest: GuestPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubMemberSession> {
//   const record = await MyGlobal.prisma.community_hub_member_sessions.findFirstOrThrow({
//     ...CommunityHubMemberSessionTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubMemberSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------