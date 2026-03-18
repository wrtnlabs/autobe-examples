import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectMembershipTransformer } from "../transformers/HrmTimeTrackingProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingProjectsProjectIdMembershipsMembershipId(props: {
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingProjectMembership> {
  const membership =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findFirstOrThrow(
      {
        where: {
          id: props.membershipId,
          hrm_time_tracking_project_id: props.projectId,
          deleted_at: null,
        },
        ...HrmTimeTrackingProjectMembershipTransformer.select(),
      },
    );
  return await HrmTimeTrackingProjectMembershipTransformer.transform(
    membership,
  );
}
