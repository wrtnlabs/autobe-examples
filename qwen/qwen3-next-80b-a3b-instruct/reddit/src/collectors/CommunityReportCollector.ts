import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityReportCollector {
  export async function collect(props: {
    body: ICommunityReport.ICreate;
    communityMembers: IEntity;
    communityGuests: IEntity;
    communityModerators: IEntity;
    communityAdmins: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reported_content_id: "", // Placeholder - required but not in ICreate DTO
      content_type: "", // Placeholder - required but not in ICreate DTO
      reason: "", // Placeholder - required but not in ICreate DTO
      created_at: new Date(),
      updated_at: new Date(),
      status: "pending",
      reporter: {
        connect: {
          id:
            props.communityMembers.id ||
            props.communityGuests.id ||
            props.communityModerators.id ||
            props.communityAdmins.id,
        },
      },
    } satisfies Prisma.community_reportsCreateInput;
  }
}
