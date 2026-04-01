import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationTransformer } from "../transformers/ErpHrmTimeOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganization.IUpdate;
}): Promise<IErpHrmTimeOrganization> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          erp_hrm_time_organization_id: props.organizationId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
        },
      },
    );
  if (membership.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.erp_hrm_time_organizations.update({
    where: {
      id: props.organizationId,
    },
    data: {
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.logoImageUrl !== undefined
        ? { logo_image_url: props.body.logoImageUrl }
        : {}),
      updated_at: new Date(),
    },
    ...ErpHrmTimeOrganizationTransformer.select(),
  });
  return await ErpHrmTimeOrganizationTransformer.transform(updated);
}
