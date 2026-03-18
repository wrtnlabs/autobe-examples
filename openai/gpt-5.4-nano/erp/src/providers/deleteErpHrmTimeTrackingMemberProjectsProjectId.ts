import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const currentOrganizationId =
    (props.member as any).organization_id ??
    (props.member as any).organizationId ??
    (props.member as any).selected_organization_id;
  await MyGlobal.prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      deleted_at: true,
      erp_hrm_time_tracking_organization_id: true,
    },
  });
}
