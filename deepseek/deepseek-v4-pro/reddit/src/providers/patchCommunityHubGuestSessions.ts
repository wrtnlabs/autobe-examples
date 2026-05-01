import { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubGuestSessions(props: {
  guest: GuestPayload;
  body: ICommunityHubMemberSession.IRequest;
}): Promise<IPageICommunityHubMemberSession.ISummary> {
  throw new HttpException(
    "Only authenticated members can access session listings",
    403,
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
// import { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
// import { IPageICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubGuestSessions(props: {
//   guest: GuestPayload;
//   body: ICommunityHubMemberSession.IRequest;
// }): Promise<IPageICommunityHubMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_member_sessions.findMany({
//     ...CommunityHubMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------