import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsFileUploadCollector } from "../collectors/HrmsFileUploadCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsFileUploadTransformer } from "../transformers/HrmsFileUploadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberUploadRequests(props: {
  member: MemberPayload;
  body: IHrmsFileUpload.ICreate;
}): Promise<IHrmsFileUpload> {
  // Validate organization exists
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: props.body.organization_id },
      select: { id: true, name: true },
    });
  // Validate member is part of the organization
  const membership =
    await MyGlobal.prisma.hrms_organization_members.findUniqueOrThrow({
      where: {
        hrms_organization_id_hrms_member_id: {
          hrms_organization_id: props.body.organization_id,
          hrms_member_id: props.member.id,
        },
      },
    });
  // Sanitize filename for safe path generation
  const sanitized_filename = props.body.original_filename
    .split(/[\/\\]/)
    [
      props.body.original_filename.split(/[\/\\]/).length - 1
    ].replace(/[^a-zA-Z0-9._-]/g, "_");
  // Generate unique upload request ID
  const id: string & tags.Format<"uuid"> = v4();
  // Generate temporary storage path
  const temporary_storage_path: string = `/uploads/${organization.id}/${id}/${sanitized_filename}`;
  // Create upload request record with validated data
  const created = await MyGlobal.prisma.hrms_file_uploads.create({
    data: await HrmsFileUploadCollector.collect({
      body: props.body,
      member: props.member,
    }),
    ...HrmsFileUploadTransformer.select(),
  });
  // Update temporary storage path
  await MyGlobal.prisma.hrms_file_uploads.update({
    where: { id: id },
    data: { temporary_storage_path: temporary_storage_path },
  });
  // Transform and return
  return await HrmsFileUploadTransformer.transform(created);
}
