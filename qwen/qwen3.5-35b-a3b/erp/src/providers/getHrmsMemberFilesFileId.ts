import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberAtSummaryTransformer } from "../transformers/HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "../transformers/HrmsOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<IHrmsFile> {
  const file = await MyGlobal.prisma.hrms_files.findUniqueOrThrow({
    where: {
      id: props.fileId,
      deleted_at: null,
    },
    select: {
      id: true,
      filename: true,
      storage_path: true,
      mime_type: true,
      file_size: true,
      file_category: true,
      owner_type: true,
      validation_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization_id: true,
      organization: HrmsOrganizationAtSummaryTransformer.select(),
      owner: HrmsMemberAtSummaryTransformer.select(),
    },
  });
  const memberOrganization =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        member: {
          id: props.member.id,
        },
        deleted_at: null,
      },
      select: {
        organization: { select: { id: true } },
      },
    });
  if (file.organization_id !== memberOrganization.organization.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: file.id,
    organization_id: file.organization_id,
    owner_id: file.owner?.id ?? undefined,
    filename: file.filename,
    storage_path: file.storage_path,
    mime_type: file.mime_type,
    file_size: file.file_size,
    file_category: file.file_category,
    owner_type: file.owner_type ?? undefined,
    validation_status: file.validation_status,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
    deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
    organization: await HrmsOrganizationAtSummaryTransformer.transform(
      file.organization,
    ),
    owner: file.owner
      ? await HrmsMemberAtSummaryTransformer.transform(file.owner)
      : null,
  };
}
