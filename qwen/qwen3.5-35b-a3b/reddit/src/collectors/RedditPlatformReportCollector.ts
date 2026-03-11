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
      reporter: { connect: { id: props.redditPlatformMembers.id } },
      community: { connect: { id: props.body.community_id } },
      resolvedBy: undefined,
      reported_content_type: props.body.reported_content_type,
      reported_content_id: props.body.reported_content_id,
      reason: props.body.reason,
      status: "PENDING",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      snapshots: undefined,
      viewHistories: undefined,
    } satisfies Prisma.reddit_platform_reportsCreateInput;
  }
}
