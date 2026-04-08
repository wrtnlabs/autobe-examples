import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformPostMetricTransformer } from "../transformers/RedditPlatformPostMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestPostsPostIdMetrics(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostMetric> {
  const record = await MyGlobal.prisma.reddit_platform_posts.findFirstOrThrow({
    ...RedditPlatformPostMetricTransformer.select(),
    where: { id: props.postId },
  });
  return await RedditPlatformPostMetricTransformer.transform(record);
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
// import { IRedditPlatformPostMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostMetric";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformGuestPostsPostIdMetrics(props: {
//   guest: GuestPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformPostMetric> {
//   const record = await MyGlobal.prisma.reddit_platform_posts.findFirstOrThrow({
//     ...RedditPlatformPostMetricTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformPostMetricTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------