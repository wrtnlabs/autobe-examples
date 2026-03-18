import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationTransformer } from "../transformers/ErpHrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationsOrganizationIdOwnershipTransfer(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmOrganization.ITransferOwnership;
}): Promise<IErpHrmOrganization> {
  // Step 1: Verify the organization exists and is not deleted
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Fetch caller's organization member record and verify Owner role
  const callerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        role_id: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
            is_builtin: true,
          },
        },
      },
    });
  if (!callerOrgMember) {
    throw new HttpException(
      "Forbidden: You are not a member of this organization",
      403,
    );
  }
  if (
    !(callerOrgMember.role.is_builtin && callerOrgMember.role.name === "Owner")
  ) {
    throw new HttpException(
      "Forbidden: Only the Owner may transfer ownership",
      403,
    );
  }
  // Step 3: Fetch and validate the target organization member
  const targetOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: props.body.targetMemberId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        status: true,
        role: {
          select: {
            name: true,
            is_builtin: true,
          },
        },
      },
    });
  if (!targetOrgMember) {
    throw new HttpException(
      "Bad Request: Target member not found in this organization",
      400,
    );
  }
  if (targetOrgMember.status !== "active") {
    throw new HttpException("Bad Request: Target member is not active", 400);
  }
  if (targetOrgMember.id === callerOrgMember.id) {
    throw new HttpException(
      "Bad Request: Target member is already the Owner",
      400,
    );
  }
  // Step 4: Fetch and validate the outgoing owner role
  const outgoingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.body.outgoingOwnerRoleId,
      erp_hrm_organization_id: props.organizationId,
    },
    select: {
      id: true,
      name: true,
      is_builtin: true,
    },
  });
  if (!outgoingRole) {
    throw new HttpException(
      "Bad Request: outgoingOwnerRoleId is not a valid role in this organization",
      400,
    );
  }
  if (outgoingRole.is_builtin && outgoingRole.name === "Owner") {
    throw new HttpException(
      "Bad Request: outgoingOwnerRoleId must not be the Owner role",
      400,
    );
  }
  // Step 5: Get the Owner role ID for this organization
  const ownerRole = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      erp_hrm_organization_id: props.organizationId,
      is_builtin: true,
      name: "Owner",
    },
    select: { id: true },
  });
  // Step 6: Execute the ownership transfer in a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_organization_members.update({
      where: { id: targetOrgMember.id },
      data: {
        role_id: ownerRole.id,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.erp_hrm_organization_members.update({
      where: { id: callerOrgMember.id },
      data: {
        role_id: props.body.outgoingOwnerRoleId,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.erp_hrm_organizations.update({
      where: { id: props.organizationId },
      data: {
        owner_member_id: targetOrgMember.member_id,
        updated_at: new Date(),
      },
    }),
  ]);
  // Step 7: Fetch and return the updated organization
  const updatedOrg =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...ErpHrmOrganizationTransformer.select(),
    });
  return ErpHrmOrganizationTransformer.transform(updatedOrg);
}
