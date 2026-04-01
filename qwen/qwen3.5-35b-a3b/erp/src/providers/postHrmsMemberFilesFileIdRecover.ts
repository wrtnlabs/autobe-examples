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
  });
  if (file.deleted_at === null) {
    throw new HttpException("File is already active", 409);
  }
  const membership =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: file.organization_id,
        deleted_at: null,
      },
    });
  const role = await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: {
      id: membership.hrms_organization_role_id,
      organization_id: file.organization_id,
    },
  });
  if (role.name !== "Owner" && role.name !== "Manager") {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.hrms_files.update({
    where: { id: props.fileId },
    data: {
      deleted_at: null,
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: file.organization_id,
      performed_by_id: props.member.id,
      action_type: "file_recovered",
      target_entity: "file",
      target_id: props.fileId,
      details: JSON.stringify({ filename: file.filename }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const recoveredFile = await MyGlobal.prisma.hrms_files.findUniqueOrThrow({
    where: { id: props.fileId },
    ...HrmsFileTransformer.select(),
  });
  return await HrmsFileTransformer.transform(recoveredFile);
}
