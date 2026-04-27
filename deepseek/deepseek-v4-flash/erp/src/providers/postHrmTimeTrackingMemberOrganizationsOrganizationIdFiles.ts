import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationFileTransformer } from "../transformers/HrmTimeTrackingOrganizationFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdFiles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganizationFile.ICreate;
}): Promise<IHrmTimeTrackingOrganizationFile> {
  // Verify organization exists
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
      },
      select: { id: true },
    });
  // For 'logo' type, validate MIME type is an image format
  if (
    props.body.type === "logo" &&
    props.body.mimeType.startsWith("image/") === false
  ) {
    throw new HttpException("Logo file must be an image", 400);
  }
  // Handle duplicate file type constraint and version logic
  const existingFile =
    await MyGlobal.prisma.hrm_time_tracking_organization_files.findFirst({
      where: {
        hrm_time_tracking_organization_id: organization.id,
        type: props.body.type,
        deleted_at: null,
      },
      select: { id: true, version: true },
    });
  let version: number | null;
  if (existingFile) {
    // Soft-delete the old file of the same type
    await MyGlobal.prisma.hrm_time_tracking_organization_files.update({
      where: { id: existingFile.id },
      data: {
        deleted_at: toISOStringSafe(new Date(Date.now())),
        updated_at: toISOStringSafe(new Date(Date.now())),
      } satisfies Prisma.hrm_time_tracking_organization_filesUpdateInput,
    });
    // Increment version for the new file
    version = (existingFile.version ?? 0) + 1;
  } else {
    // New file — use provided version or default to 1
    version = props.body.version ?? 1;
  }
  // Create the file record
  const now = toISOStringSafe(new Date(Date.now()));
  const created =
    await MyGlobal.prisma.hrm_time_tracking_organization_files.create({
      data: {
        id: v4(),
        name: props.body.name,
        extension: props.body.extension,
        mime_type: props.body.mimeType,
        size: props.body.size,
        url: props.body.url,
        type: props.body.type,
        version,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        organization: { connect: { id: organization.id } },
      } satisfies Prisma.hrm_time_tracking_organization_filesCreateInput,
      ...HrmTimeTrackingOrganizationFileTransformer.select(),
    });
  return await HrmTimeTrackingOrganizationFileTransformer.transform(created);
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
// import { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdFiles(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingOrganizationFile.ICreate;
// }): Promise<IHrmTimeTrackingOrganizationFile> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_organization_files.create({
//     data: await HrmTimeTrackingOrganizationFileCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingOrganizationFileTransformer.select(),
//   });
//   return await HrmTimeTrackingOrganizationFileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------