import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommunityModeratorTransformer } from "../transformers/CommunityHubCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityHubCommunitiesCommunityNameModeratorsModeratorId(props: {
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubCommunityModerator> {
  const community =
    await MyGlobal.prisma.community_hub_communities.findFirstOrThrow({
      where: {
        name: { equals: props.communityName, mode: "insensitive" },
        deleted_at: null,
      },
      select: { id: true },
    });
  const record =
    await MyGlobal.prisma.community_hub_community_moderators.findFirstOrThrow({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: props.moderatorId,
      },
      ...CommunityHubCommunityModeratorTransformer.select(),
    });
  return await CommunityHubCommunityModeratorTransformer.transform(record);
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
// import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityHubCommunitiesCommunityNameModeratorsModeratorId(props: {
//   communityName: string;
//   moderatorId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubCommunityModerator> {
//   const record = await MyGlobal.prisma.community_hub_community_moderators.findFirstOrThrow({
//     ...CommunityHubCommunityModeratorTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubCommunityModeratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------