import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationFileTransformer } from "../transformers/HrmPlatformOrganizationFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberOrganizationsOrganizationIdFilesFileId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformOrganizationFile> {
  const record =
    await MyGlobal.prisma.hrm_platform_organization_files.findFirstOrThrow({
      ...HrmPlatformOrganizationFileTransformer.select(),
      where: {
        id: props.fileId,
        hrm_platform_organization_id: props.organizationId,
      },
    });
  return await HrmPlatformOrganizationFileTransformer.transform(record);
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
// import { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberOrganizationsOrganizationIdFilesFileId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   fileId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformOrganizationFile> {
//   const record = await MyGlobal.prisma.hrm_platform_organization_files.findFirstOrThrow({
//     ...HrmPlatformOrganizationFileTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformOrganizationFileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------