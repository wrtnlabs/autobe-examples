import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformReportCollector {
  export async function collect(props: {
    body: IRedditPlatformReport.ICreate;
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: { connect: { id: props.redditPlatformMembers.id } },
      post: props.body.post_id
        ? { connect: { id: props.body.post_id } }
        : undefined,
      comment: props.body.comment_id
        ? { connect: { id: props.body.comment_id } }
        : undefined,
      reviewer: undefined,
      snapshots: undefined,
    } satisfies Prisma.reddit_platform_reportsCreateInput;
  }
}
