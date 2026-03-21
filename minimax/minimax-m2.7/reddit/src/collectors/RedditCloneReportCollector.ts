import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneReportCollector {
  export async function collect(props: {
    body: IRedditCloneReport.ICreate;
    redditCloneMembers: IEntity;
    redditCloneCommunities: IEntity;
  }) {
    return {
      id: v4(),
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      reporter: { connect: { id: props.redditCloneMembers.id } },
      community: { connect: { id: props.redditCloneCommunities.id } },
    } satisfies Prisma.reddit_clone_reportsCreateInput;
  }
}
