import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunityIdAppointedModeratorsAppointmentId(props: {
  communityId: string & tags.Format<"uuid">;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  const record =
    await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.appointmentId },
        ...CommunityPlatformCommunityModeratorTransformer.select(),
      },
    );
  if (record.community.id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformCommunityModeratorTransformer.transform(record);
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
// import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityPlatformCommunitiesCommunityIdAppointedModeratorsAppointmentId(props: {
//   communityId: string & tags.Format<"uuid">;
//   appointmentId: string & tags.Format<"uuid">;
// }): Promise<ICommunityPlatformCommunityModerator> {
//   const record = await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow({
//     ...CommunityPlatformCommunityModeratorTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformCommunityModeratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------