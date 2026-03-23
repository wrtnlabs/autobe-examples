import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerOrganizationTransformer } from "../transformers/HrmTrackerOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string;
}): Promise<IHrmTrackerOrganization> {
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmTrackerOrganizationTransformer.select(),
    });
  return await HrmTrackerOrganizationTransformer.transform(organization);
}
