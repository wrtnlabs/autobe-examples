import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectTransformer } from "../transformers/ErpHrmProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProject> {
  // Find the project and verify it exists (not soft-deleted)
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
  });
  // Validate current status is 'archived' - only archived projects can be reactivated
  if (project.status !== "archived") {
    throw new HttpException(
      "INVALID_STATUS_TRANSITION: Only archived projects can be reactivated",
      400,
    );
  }
  // Update project status to 'active' and refresh updated_at timestamp
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: {
      status: "active",
      updated_at: new Date(),
    },
  });
  // Fetch the updated project with full transformer select
  const updated = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    ...ErpHrmProjectTransformer.select(),
  });
  // Transform and return the project
  return await ErpHrmProjectTransformer.transform(updated);
}
