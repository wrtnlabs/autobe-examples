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
    user: IEntity;
    reportReason: IEntity;
  }) {
    const id = v4();
    return {
      id,
      description: "",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.user.id } },
      reportReason: { connect: { id: props.reportReason.id } },
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}
