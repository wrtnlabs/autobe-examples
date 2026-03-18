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
import { HrmsFileTransformer } from "../transformers/HrmsFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberFilesFileIdRecover(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<IHrmsFile> {
  const file = await MyGlobal.prisma.hrms_files.findUniqueOrThrow({
    where: { id: props.fileId },
    select: {
      id: true,
      organization_id: true,
      filename: true,
      deleted_at: true,
      updated_at: true,
    },
  });
  if (file.deleted_at !== null) {
    throw new HttpException("File is already active", 409);
  }
  const membership = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: file.organization_id,
    },
    select: {
      hrms_organization_role_id: true,
    },
  });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      id: membership.hrms_organization_role_id,
    },
  });
  if (!role) {
    throw new HttpException("Forbidden", 403);
  }
  const updatedFile = await MyGlobal.prisma.hrms_files.update({
    where: { id: file.id },
    data: {
      deleted_at: null,
      updated_at: new Date(),
    },
    ...HrmsFileTransformer.select(),
  });
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: file.organization_id,
      performed_by_id: props.member.id,
      action_type: "file_recovered",
      target_entity: "file",
      target_id: file.id,
      details: `File '${file.filename}' was recovered`,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return await HrmsFileTransformer.transform(updatedFile);
}
