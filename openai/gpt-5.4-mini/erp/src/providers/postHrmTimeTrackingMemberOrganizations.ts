import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingOrganizationCollector } from "../collectors/HrmTimeTrackingOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingOrganization.ICreate;
}): Promise<IHrmTimeTrackingOrganization> {
  const created = await MyGlobal.prisma.hrm_time_tracking_organizations.create({
    data: await HrmTimeTrackingOrganizationCollector.collect({
      body: props.body,
    }),
    ...HrmTimeTrackingOrganizationTransformer.select(),
  });
  return await HrmTimeTrackingOrganizationTransformer.transform(created);
}
