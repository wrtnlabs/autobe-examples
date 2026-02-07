import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformReport.ICreate;
    communityPlatformMembers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      status: "pending",
      reason: props.body.reason,
      reported_content_type: props.body.reported_content_type,
      reported_content_id: props.body.reported_content_id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      category: { connect: { id: props.body.report_categories_id } },
      user: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}
