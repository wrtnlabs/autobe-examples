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
  const created = await MyGlobal.prisma.hrms_file_uploads.create({
    data: await HrmsFileUploadCollector.collect({
      body: props.body,
      member: props.member,
    }),
    ...HrmsFileUploadTransformer.select(),
  });
  return await HrmsFileUploadTransformer.transform(created);
}
