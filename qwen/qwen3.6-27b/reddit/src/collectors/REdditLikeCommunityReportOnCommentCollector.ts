import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace REdditLikeCommunityReportOnCommentCollector {
  export async function collect(props: {
    body: IREdditLikeCommunityReportOnComment.ICreate;
    redditLikeCommunityReports: IEntity;
  }) {
    const id = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report: { connect: { id: props.redditLikeCommunityReports.id } },
      comment: { connect: { id: props.body.comment_id } },
    } satisfies Prisma.reddit_like_community_report_on_commentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace REdditLikeCommunityReportOnCommentCollector {
//         export async function collect(props: {
//           body: IREdditLikeCommunityReportOnComment.ICreate;
//           redditLikeCommunityReports: IEntity; // from path parameter reportId
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       report: ...,
//       comment: ...,
//           } satisfies Prisma.reddit_like_community_report_on_commentsCreateInput;
//         }
//       }
//--------------------------------------------------------------