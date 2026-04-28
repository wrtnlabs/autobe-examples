import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.ICompleteRequest;
}): Promise<IHrmPlatformProject> {
  const record = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    ...HrmPlatformProjectTransformer.select(),
  });
  if (record.status !== "Active") {
    throw new HttpException(
      "Archival status conflict: project is not active",
      409,
    );
  }
  const end_date: Date | null =
    props.body.end_date !== undefined && props.body.end_date !== null
      ? new Date(props.body.end_date)
      : (record.end_date ?? new Date());
  const updated = await MyGlobal.prisma.hrm_platform_projects.update({
    where: {
      id: props.projectId,
    },
    data: {
      status: "Completed",
      end_date: end_date,
      updated_at: new Date(),
    },
    ...HrmPlatformProjectTransformer.select(),
  });
  const orgId = (updated as any).hrm_platform_organization_id;
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: orgId,
      hrm_platform_member_id: props.member.id,
      action_type: "project_completed",
      entity_type: "project",
      entity_id: updated.id,
      entity_name: updated.name,
      created_at: new Date(),
    },
  });
  return await HrmPlatformProjectTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberProjectsProjectId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmPlatformProject.ICompleteRequest;
// }): Promise<IHrmPlatformProject> {
//   const record = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
//     ...HrmPlatformProjectTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformProjectTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------