import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingProjectTransformer } from "../transformers/ErpHrmTimeTrackingProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingProject> {
  // TODO: Implement using MyGlobal.prisma scoped query and IErpHrmTimeTrackingProjectTransformer.
  return await ErpHrmTimeTrackingProjectTransformer.transform(
    await MyGlobal.prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
      },
      ...ErpHrmTimeTrackingProjectTransformer.select(),
    }),
  );
}
