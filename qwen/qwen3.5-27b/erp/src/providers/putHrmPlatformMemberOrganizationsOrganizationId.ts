import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationTransformer } from "../transformers/HrmPlatformOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganization.IUpdate;
}): Promise<IHrmPlatformOrganization> {
  // Find organization and validate access
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
      },
    });
  // Validate member is owner or has admin role
  if (organization.owner_id !== props.member.id) {
    // Check if member has admin role in this organization
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
        deleted_at: null,
        role: {
          name: {
            in: ["Owner", "Manager"],
          },
        },
      },
      select: { id: true },
    });
    if (!employee) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Check name uniqueness if updating
  if (props.body.name !== undefined && props.body.name !== organization.name) {
    const existing = await MyGlobal.prisma.hrm_platform_organizations.findFirst(
      {
        where: {
          name: props.body.name,
          id: { not: props.organizationId },
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    if (existing) {
      throw new HttpException("Organization name already exists", 409);
    }
  }
  // Update organization
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: { id: props.organizationId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // Upsert organization settings
  if (
    props.body.currency !== undefined ||
    props.body.timezone !== undefined ||
    props.body.fiscal_year_start_month !== undefined
  ) {
    await MyGlobal.prisma.hrm_platform_organization_settings.upsert({
      where: {
        organization_id: props.organizationId,
      },
      create: {
        id: v4(),
        organization_id: props.organizationId,
        currency: props.body.currency ?? "USD",
        timezone: props.body.timezone ?? "UTC",
        fiscal_year_start_month: props.body.fiscal_year_start_month ?? 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        ...(props.body.currency !== undefined && {
          currency: props.body.currency,
        }),
        ...(props.body.timezone !== undefined && {
          timezone: props.body.timezone,
        }),
        ...(props.body.fiscal_year_start_month !== undefined && {
          fiscal_year_start_month: props.body.fiscal_year_start_month,
        }),
        updated_at: new Date(),
      },
    });
  }
  // Upsert organization logo
  if (props.body.image_url !== undefined) {
    await MyGlobal.prisma.hrm_platform_organization_logos.upsert({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
      create: {
        id: v4(),
        hrm_platform_organization_id: props.organizationId,
        image_url: props.body.image_url,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        image_url: props.body.image_url,
        updated_at: new Date(),
      },
    });
  }
  // Return updated organization
  const updated =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmPlatformOrganizationTransformer.select(),
    });
  return await HrmPlatformOrganizationTransformer.transform(updated);
}
