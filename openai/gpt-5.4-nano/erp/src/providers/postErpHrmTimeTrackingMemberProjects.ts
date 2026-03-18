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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingProject.ICreate;
}): Promise<IErpHrmTimeTrackingProject> {
  const selectedOrganizationId = props.member.session_id;
  const deletedAtInput = (
    props.body as IErpHrmTimeTrackingProject.ICreate & {
      deleted_at?: Date | string | null;
    }
  ).deleted_at;
  const deleted_at: string | null =
    deletedAtInput === null || deletedAtInput === undefined
      ? null
      : typeof deletedAtInput === "string"
        ? deletedAtInput
        : toISOStringSafe(deletedAtInput);
  const project = await MyGlobal.prisma.erp_hrm_time_tracking_projects.create({
    data: {
      erp_hrm_time_tracking_organization_id: selectedOrganizationId,
      name: props.body.name,
      deleted_at,
    } as any,
  });
  return project as unknown as IErpHrmTimeTrackingProject;
}
