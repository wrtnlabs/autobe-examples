import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneReportActionCollector {
  export async function collect(props: {
    body: IRedditCloneReportAction.ICreate;
    redditCloneReports: IEntity;
    redditCloneModerators: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      action: props.body.action,
      created_at: new Date(),
      report: { connect: { id: props.redditCloneReports.id } },
      moderator: { connect: { id: props.redditCloneModerators.id } },
    } satisfies Prisma.reddit_clone_report_actionsCreateInput;
  }
}
