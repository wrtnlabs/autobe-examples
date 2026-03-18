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

export async function getHrmsMemberFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<IHrmsFile> {
  const file = await MyGlobal.prisma.hrms_files.findUniqueOrThrow({
    where: {
      id: props.fileId,
      deleted_at: null,
    } satisfies Prisma.hrms_filesWhereInput,
    ...HrmsFileTransformer.select(),
  });
  const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: file.organization.id,
    } satisfies Prisma.hrms_organization_membersWhereInput,
    select: { id: true, hrms_organization_id: true },
  });
  if (memberOrg === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmsFileTransformer.transform(file);
}
