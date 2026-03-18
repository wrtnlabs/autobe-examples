import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingEmployeeOrganizationsOrganizationId(props: {
  employee: EmployeePayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganization.IUpdate;
}): Promise<IHrmTimeTrackingOrganization> {
  await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
    where: {
      id: props.employee.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_organizations.update({
      where: {
        id: props.organizationId,
      },
      data: {
        ...(props.body.name !== undefined ? { name: props.body.name } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.logo_uri !== undefined
          ? { logo_uri: props.body.logo_uri }
          : {}),
        ...(props.body.currency_code !== undefined
          ? { currency_code: props.body.currency_code }
          : {}),
        ...(props.body.timezone !== undefined
          ? { timezone: props.body.timezone }
          : {}),
        ...(props.body.fiscal_start_month !== undefined
          ? { fiscal_start_month: props.body.fiscal_start_month }
          : {}),
        updated_at: now,
      },
    });
  });
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      ...HrmTimeTrackingOrganizationTransformer.select(),
    });
  return await HrmTimeTrackingOrganizationTransformer.transform(organization);
}
