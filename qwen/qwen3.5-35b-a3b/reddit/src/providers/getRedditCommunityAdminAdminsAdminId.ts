import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityAdminTransformer } from "../transformers/RedditCommunityAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getRedditCommunityAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string;
}): Promise<IRedditCommunityAdmin> {
  const record = await MyGlobal.prisma.reddit_community_admins.findFirstOrThrow(
    {
      ...RedditCommunityAdminTransformer.select(),
      where: {
        id: props.adminId,
        deleted_at: null,
      },
    },
  );
  return await RedditCommunityAdminTransformer.transform(record);
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
// import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityAdminAdminsAdminId(props: {
//   admin: AdminPayload;
//   adminId: string;
// }): Promise<IRedditCommunityAdmin> {
//   const record = await MyGlobal.prisma.reddit_community_admins.findFirstOrThrow({
//     ...RedditCommunityAdminTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------