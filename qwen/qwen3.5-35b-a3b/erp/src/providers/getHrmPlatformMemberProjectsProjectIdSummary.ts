import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdSummary(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProject.ISummary> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
    ...HrmPlatformProjectAtSummaryTransformer.select(),
    where: {
      id: props.projectId,
      deleted_at: null,
      memberships: {
        some: {
          employee: {
            member: {
              id: props.member.id,
            },
          },
        },
      },
    } satisfies Prisma.hrm_platform_projectsWhereInput,
  });
  return await HrmPlatformProjectAtSummaryTransformer.transform(project);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberProjectsProjectIdSummary(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformProject.ISummary> {
//   const record = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
//     ...HrmPlatformProjectAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformProjectAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------