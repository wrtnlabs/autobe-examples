import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackOrganizationTransformer } from "../transformers/HrmTimeTrackOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberOrganizationsOrganizationIdSwitch(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackOrganization> {
  // Step 1: Find the target organization and verify it exists and is not deleted
  const organization =
    await MyGlobal.prisma.hrm_time_track_organizations.findFirstOrThrow({
      ...HrmTimeTrackOrganizationTransformer.select(),
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
    });
  // Step 2: Verify the member has an active employee record in the target organization
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: props.organizationId,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Step 3: Update the session's organization context
  await MyGlobal.prisma.hrm_time_track_member_sessions.update({
    where: {
      id: props.member.session_id,
    },
    data: {
      hrm_time_track_organization_id: props.organizationId,
    },
  });
  // Step 4: Return the organization details
  return await HrmTimeTrackOrganizationTransformer.transform(organization);
}
