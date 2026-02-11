import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformReportResolutionCollector {
  export async function collect(props: {
    body: IRedditPlatformReportResolution.ICreate;
    redditPlatformAdmins: IEntity;
    redditPlatformReport: IEntity;
  }) {
    return {
      id: v4(),
      status: props.body.status,
      resolution_notes: props.body.resolution_notes ?? null,
      resolved_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      admin: { connect: { id: props.redditPlatformAdmins.id } },
      report: { connect: { id: props.redditPlatformReport.id } },
    } satisfies Prisma.reddit_platform_report_resolutionsCreateInput;
  }
}
