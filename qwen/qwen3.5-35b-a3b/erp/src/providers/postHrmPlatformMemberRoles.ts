import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function postHrmPlatformMemberRoles(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  body: IHrmPlatformRole.ICreate;
}): Promise<IHrmPlatformRole> {
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  if (session === null) {
    throw new HttpException("You are not enrolled", 403);
  }
  const organizationId = session.organization_id;
  if (!organizationId) {
    throw new HttpException("Organization context required", 403);
  }
  if (props.body.role_kind !== "custom") {
    throw new HttpException("Only custom roles can be created", 400);
  }
  const nameTrimmed = props.body.name.trim();
  if (nameTrimmed.length < 1) {
    throw new HttpException("Name cannot be empty", 400);
  }
  if (nameTrimmed.length > 100) {
    throw new HttpException("Name cannot exceed 100 characters", 400);
  }
  const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: organizationId,
      name: {
        equals: nameTrimmed,
        mode: "insensitive",
      },
      deleted_at: null,
    },
  });
  if (existingRole !== null) {
    throw new HttpException("Role name already exists", 409);
  }
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findFirst({
      where: {
        id: organizationId,
        deleted_at: null,
      },
      include: {
        owner: true,
      },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const timestamp = new Date();
  const created = await MyGlobal.prisma.hrm_platform_roles.create({
    data: {
      id: v4(),
      name: nameTrimmed,
      description: props.body.description ?? null,
      role_kind: props.body.role_kind,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      organization: {
        connect: {
          id: organizationId,
        },
      },
    },
    include: {
      organization: true,
      permissions: true,
    },
  });
  const response: IHrmPlatformRole = {
    id: created.id,
    name: created.name,
    description: created.description ?? "",
    role_kind: created.role_kind,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
    organization: {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscal_start_month: organization.fiscal_start_month,
      created_at: toISOStringSafe(organization.created_at),
      updated_at: toISOStringSafe(organization.updated_at),
      deleted_at:
        organization.deleted_at !== null
          ? toISOStringSafe(organization.deleted_at)
          : null,
      owner: {
        id: organization.owner.id,
        email: organization.owner.email ?? undefined,
        is_active: organization.owner.is_active,
        created_at: toISOStringSafe(organization.owner.created_at),
        updated_at: toISOStringSafe(organization.owner.updated_at),
        display_name: organization.owner.display_name ?? undefined,
      },
    },
    permissions: await ArrayUtil.asyncMap(
      created.permissions,
      async (permission) => ({
        id: permission.id,
        code: permission.code,
        description: permission.description ?? null,
      }),
    ),
  };
  return response;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberRoles(props: {
//   member: MemberPayload;
//   body: IHrmPlatformRole.ICreate;
// }): Promise<IHrmPlatformRole> {
//   const record = await MyGlobal.prisma.hrm_platform_roles.create({
//     data: await HrmPlatformRoleCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformRoleTransformer.select(),
//   });
//   return await HrmPlatformRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------