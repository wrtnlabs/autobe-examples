import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findUniqueOrThrow(
      {
        where: { id: props.organizationId },
        select: { id: true, deleted_at: true },
      },
    );
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization already deleted", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_organizations.delete({
      where: { id: props.organizationId },
    });
  });
}
