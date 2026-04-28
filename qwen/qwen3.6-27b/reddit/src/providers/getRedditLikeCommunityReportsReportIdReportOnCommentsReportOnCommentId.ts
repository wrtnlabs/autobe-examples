import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityReportOnCommentTransformer } from "../transformers/REdditLikeCommunityReportOnCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityReportsReportIdReportOnCommentsReportOnCommentId(props: {
  reportId: string & tags.Format<"uuid">;
  reportOnCommentId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityReportOnComment> {
  const record =
    await MyGlobal.prisma.reddit_like_community_report_on_comments.findFirstOrThrow(
      {
        ...REdditLikeCommunityReportOnCommentTransformer.select(),
        where: {
          id: props.reportOnCommentId,
          reddit_like_community_report_id: props.reportId,
          deleted_at: null,
        },
      },
    );
  return await REdditLikeCommunityReportOnCommentTransformer.transform(record);
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
// import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
// import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditLikeCommunityReportsReportIdReportOnCommentsReportOnCommentId(props: {
//   reportId: string & tags.Format<"uuid">;
//   reportOnCommentId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityReportOnComment> {
//   const record = await MyGlobal.prisma.reddit_like_community_report_on_comments.findFirstOrThrow({
//     ...REdditLikeCommunityReportOnCommentTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityReportOnCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------