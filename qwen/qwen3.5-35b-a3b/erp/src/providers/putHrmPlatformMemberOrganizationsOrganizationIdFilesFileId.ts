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

export async function putHrmPlatformMemberOrganizationsOrganizationIdFilesFileId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationFile.IUpdate;
}): Promise<IHrmPlatformOrganizationFile> {
  const data: Prisma.hrm_platform_organization_filesUpdateInput = {};
  if (props.body.file_name !== undefined) {
    data.file_name = props.body.file_name;
  }
  if (props.body.file_type !== undefined) {
    data.file_type = props.body.file_type;
  }
  if (props.body.file_size !== undefined) {
    data.file_size = props.body.file_size;
  }
  if (props.body.storage_type !== undefined) {
    data.storage_type = props.body.storage_type;
  }
  if (props.body.url !== undefined) {
    data.url = props.body.url ?? null;
  }
  if (props.body.status !== undefined) {
    data.status = props.body.status;
    if (props.body.status === "deleted") {
      data.deleted_at = new Date();
    }
  }
  data.updated_at = new Date();
  await MyGlobal.prisma.hrm_platform_organization_files.update({
    where: {
      id: props.fileId,
      hrm_platform_organization_id: props.organizationId,
    },
    data,
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_organization_files.findUniqueOrThrow({
      where: { id: props.fileId },
      ...HrmPlatformOrganizationFileTransformer.select(),
    });
  return await HrmPlatformOrganizationFileTransformer.transform(updated);
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
// export async function putHrmPlatformMemberOrganizationsOrganizationIdFilesFileId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   fileId: string & tags.Format<"uuid">;
//   body: IHrmPlatformOrganizationFile.IUpdate;
// }): Promise<IHrmPlatformOrganizationFile> {
//   await MyGlobal.prisma.hrm_platform_organization_files.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_organization_files.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformOrganizationFileTransformer.select(),
//   });
//   return await HrmPlatformOrganizationFileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------