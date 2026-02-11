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
    redditPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reported_type: props.body.reported_type,
      reported_id: props.body.reported_id,
      reason: props.body.reason,
      status: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      reporter: { connect: { id: props.redditPlatformMembers.id } },
      resolvedBy: undefined,
    } satisfies Prisma.reddit_platform_reportsCreateInput;
  }
}
