import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerOrganizationCollector } from "../collectors/HrmTrackerOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerOrganizationTransformer } from "../transformers/HrmTrackerOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postHrmTrackerMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmTrackerOrganization.ICreate;
}): Promise<IHrmTrackerOrganization> {
  const created = await MyGlobal.prisma.hrm_tracker_organizations.create({
    data: await HrmTrackerOrganizationCollector.collect({
      body: props.body,
      hrmTrackerMembers: {
        id: props.member.id as string & tags.Format<"uuid">,
      },
    }),
    ...HrmTrackerOrganizationTransformer.select(),
  });
  return await HrmTrackerOrganizationTransformer.transform(created);
}
