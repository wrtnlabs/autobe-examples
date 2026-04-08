import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackOrganizationCollector } from "../collectors/HrmTimeTrackOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackOrganizationTransformer } from "../transformers/HrmTimeTrackOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackOrganization.ICreate;
}): Promise<IHrmTimeTrackOrganization> {
  const record = await MyGlobal.prisma.hrm_time_track_organizations.create({
    data: await HrmTimeTrackOrganizationCollector.collect({
      body: props.body,
    }),
    ...HrmTimeTrackOrganizationTransformer.select(),
  });
  return await HrmTimeTrackOrganizationTransformer.transform(record);
}
