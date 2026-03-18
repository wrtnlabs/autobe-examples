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

export async function patchErpHrmMemberProjectsProjectIdComplete(props: {
  member: MemberPayload;
  projectId: string;
}): Promise<IErpHrmProject> {
  // Verify project exists, belongs to member's organization, and is in active status
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.projectId,
      organization_id: (
        props.member as unknown as {
          organization_id: string;
        }
      ).organization_id,
      status: "active",
      deleted_at: null,
    },
    ...ErpHrmProjectTransformer.select(),
  });
  if (project === null) {
    throw new HttpException("Project not found or cannot be completed", 404);
  }
  // Update project status to completed with current timestamp
  const updated = await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: {
      status: "completed",
      updated_at: new Date(),
    },
    ...ErpHrmProjectTransformer.select(),
  });
  // Transform to DTO using the transformer
  return await ErpHrmProjectTransformer.transform(updated);
}
