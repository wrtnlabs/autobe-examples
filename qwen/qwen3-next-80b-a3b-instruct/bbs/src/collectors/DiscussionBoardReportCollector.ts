import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardReportCollector {
  export async function collect(props: {
    body: IDiscussionBoardReport.ICreate;
    discussionBoardCitizen: IEntity; // from authorized actor
    discussionBoardArticles: IEntity; // from path parameter articleId
  }) {
    return {
      id: v4(),
      target_type: props.body.target_content_type,
      target_id: props.discussionBoardArticles.id,
      reason: props.body.report_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report_state: "pending",
      reporter: { connect: { id: props.discussionBoardCitizen.id } },
      moderatorReporter: undefined,
    } satisfies Prisma.discussion_board_reportsCreateInput;
  }
}
