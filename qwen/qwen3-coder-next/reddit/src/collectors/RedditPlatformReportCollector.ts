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
    redditPlatformUsers: IEntity;
    redditPlatformReports: IEntity;
    resolver?: IEntity;
  }) {
    return {
      id: v4(),
      target_type: props.redditPlatformReports.target_type,
      target_id: props.redditPlatformReports.target_id,
      reason: props.redditPlatformReports.reason,
      status: props.redditPlatformReports.status,
      created_at: new Date(),
      updated_at: new Date(),
      reporter: { connect: { id: props.redditPlatformUsers.id } },
      resolver: props.resolver
        ? { connect: { id: props.resolver.id } }
        : undefined,
      reddit_platform_moderation_logs: undefined,
    } satisfies Prisma.reddit_platform_reportsCreateInput;
  }
}
