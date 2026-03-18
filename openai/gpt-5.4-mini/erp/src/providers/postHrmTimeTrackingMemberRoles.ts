import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingRoleCollector } from "../collectors/HrmTimeTrackingRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberRoles(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingRole.ICreate;
}): Promise<IHrmTimeTrackingRole> {
  const reservedNames = ["Owner", "Manager", "Employee"] as const;
  if (reservedNames.some((name) => name === props.body.name))
    throw new HttpException("Reserved role name", 400);
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const duplicate = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      organization_id: organization.id,
      deleted_at: null,
      OR: [
        { name: props.body.name },
        ...(props.body.code === undefined || props.body.code === null
          ? []
          : [{ code: props.body.code }]),
      ],
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });
  if (duplicate !== null) {
    if (duplicate.name === props.body.name)
      throw new HttpException("Role name already exists", 409);
    if (
      props.body.code !== undefined &&
      props.body.code !== null &&
      duplicate.code === props.body.code
    )
      throw new HttpException("Role code already exists", 409);
  }
  const created = await MyGlobal.prisma.hrm_time_tracking_roles.create({
    data: await HrmTimeTrackingRoleCollector.collect({
      body: props.body,
      organization,
    }),
    ...HrmTimeTrackingRoleTransformer.select(),
  });
  return await HrmTimeTrackingRoleTransformer.transform(created);
}
